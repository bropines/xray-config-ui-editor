import { describe, expect, it } from 'bun:test';
import { seededRng } from './bytes';
import { sipDefaults } from './packets/sip';
import { noiseItems } from '../presets/noise';
import {
    combinationNotes,
    datagramCount,
    fromNoiseItems,
    largestDatagram,
    newTemplate,
    packetBytes,
    packetStep,
    parseRange,
    recipeProblems,
    redrawRecipe,
    renderStep,
    toNoiseItems,
    type PacketStep,
    type Recipe,
} from './recipe';

/**
 * A recipe is the editable half of a noise layer: the parameters that built
 * each decoy, which the config cannot hold. The two directions have to agree —
 * what is written must read back as the same datagrams — and a packet must be
 * a function of its parameters and its seed, or editing one field would
 * reshuffle every other packet in the chain.
 */

const rng = () => seededRng('test');

const junk = (count: number, size: string): Recipe => ({ steps: [{ kind: 'junk', count, size }] });

describe('what a recipe writes', () => {
    it('writes a packet as hex and junk as one item per datagram', () => {
        const recipe: Recipe = {
            steps: [
                { kind: 'packet', template: { kind: 'hex', hex: 'deadbeef' }, hex: 'deadbeef', seed: 'x', delay: '5-10' },
                { kind: 'junk', count: 3, size: '40-70' },
            ],
        };
        expect(toNoiseItems(recipe)).toEqual([
            { type: 'hex', packet: 'deadbeef', delay: '5-10' },
            { rand: '40-70' },
            { rand: '40-70' },
            { rand: '40-70' },
        ]);
    });

    it('leaves out what was never set, rather than writing an empty string', () => {
        const [item] = toNoiseItems(junk(1, '40-70'));
        expect(Object.keys(item!)).toEqual(['rand']);
    });
});

describe('what a recipe reads back', () => {
    it('folds a run of matching junk items into one step', () => {
        const recipe = fromNoiseItems([{ rand: '40-70' }, { rand: '40-70' }, { rand: '40-70' }], undefined, rng());
        expect(recipe.steps).toHaveLength(1);
        expect(recipe.steps[0]).toMatchObject({ kind: 'junk', count: 3, size: '40-70' });
    });

    it('keeps junk apart when it differs, since the difference is on the wire', () => {
        const recipe = fromNoiseItems([{ rand: '40-70' }, { rand: '10-20' }, { rand: '40-70', delay: '5' }], undefined, rng());
        expect(recipe.steps.map(step => step.kind === 'junk' && step.count)).toEqual([1, 1, 1]);
    });

    it('survives a round trip', () => {
        const items = [{ type: 'hex', packet: 'cafe' }, { rand: '40-70' }, { rand: '40-70' }];
        expect(toNoiseItems(fromNoiseItems(items, undefined, rng()))).toEqual(items);
    });

    it('leaves a real preset untouched when nothing is edited', () => {
        // Opening the generator on an existing layer and pressing Apply has to
        // be a no-op. The WARP presets are the layer most people will open it
        // on, and they carry the two things easiest to lose on the way round:
        // a per-packet delay, and a run of junk that folds into one step.
        const noise = noiseItems('warp-c');
        expect(toNoiseItems(fromNoiseItems(noise, undefined, rng()))).toEqual(noise as never);
    });

    it('carries the layer reset, and only when there is one', () => {
        expect(fromNoiseItems([], '120-180', rng()).reset).toBe('120-180');
        expect(fromNoiseItems([], undefined, rng()).reset).toBeUndefined();
    });

    it('ignores what is not a noise item instead of throwing', () => {
        expect(fromNoiseItems('nonsense', undefined, rng()).steps).toEqual([]);
        expect(fromNoiseItems([null, 42, {}, { rand: '1-2' }], undefined, rng()).steps).toHaveLength(1);
    });

    it('keeps bytes it cannot decode rather than dropping them', () => {
        // The config is the user's; a reader does not get to delete from it.
        const recipe = fromNoiseItems([{ type: 'hex', packet: 'zz' }], undefined, rng());
        expect((recipe.steps[0] as PacketStep).hex).toBe('zz');
    });
});

describe('packetBytes', () => {
    const hi = new Uint8Array([0x68, 0x69]);

    it('decodes each encoding the core accepts', () => {
        expect(packetBytes({ type: 'hex', packet: '6869' })).toEqual(hi);
        expect(packetBytes({ type: 'str', packet: 'hi' })).toEqual(hi);
        expect(packetBytes({ type: 'base64', packet: 'aGk=' })).toEqual(hi);
        // An absent type means a JSON array (PraseByteSlice's "" case).
        expect(packetBytes({ packet: [0x68, 0x69] })).toEqual(hi);
        expect(packetBytes({ type: 'array', packet: [0x68, 0x69] })).toEqual(hi);
    });

    it('refuses what does not decode, rather than guessing', () => {
        expect(packetBytes({ type: 'hex', packet: 'abc' })).toBeNull();
        expect(packetBytes({ type: 'hex', packet: 42 })).toBeNull();
        expect(packetBytes({ packet: [999] })).toBeNull();
        expect(packetBytes({ type: 'nope', packet: 'hi' })).toBeNull();
    });

    it('has no bytes for an item written as an expression, which only the core can build', () => {
        expect(packetBytes({ type: 'exp', packet: '<b 0xDEADBEEF><r 8><t>' })).toBeNull();
    });
});

describe('drawing a packet', () => {
    it('is the same packet every time from the same seed', async () => {
        const { step } = await packetStep(newTemplate('dns', rng()), rng());
        const again = await renderStep(step);
        expect(again.step.hex).toBe(step.hex);
    });

    it('comes out different from a new seed', async () => {
        const { step } = await packetStep(newTemplate('sip', rng()), rng());
        const { recipe } = await redrawRecipe({ steps: [step] }, seededRng('other'));
        expect((recipe.steps[0] as PacketStep).hex).not.toBe(step.hex);
    });

    it('leaves a parameter edit to change only what depends on it', async () => {
        const template = newTemplate('dns', rng());
        if (template.kind !== 'dns') throw new Error('expected a dns template');
        const { step } = await packetStep(template, rng());
        // Same seed, one field changed: the query id is drawn from the seed
        // and must survive, so the two packets differ only where the name is.
        const edited = await renderStep({
            ...step,
            template: { kind: 'dns', params: { ...template.params, name: 'edited.example.net' } },
        });
        expect(edited.step.hex).not.toBe(step.hex);
        expect(edited.step.hex.slice(0, 4)).toBe(step.hex.slice(0, 4));
    });
});

describe('parseRange', () => {
    it('reads what Xray reads', () => {
        expect(parseRange('40-70')).toEqual([40, 70]);
        expect(parseRange('64')).toEqual([64, 64]);
        // ensureOrder() puts a reversed range the right way round.
        expect(parseRange('70-40')).toEqual([40, 70]);
        expect(parseRange(undefined)).toBeNull();
        expect(parseRange('')).toBeNull();
        expect(parseRange('wide')).toBeNull();
    });
});

describe('what a recipe adds up to', () => {
    it('counts every datagram, not every step', () => {
        expect(datagramCount({ steps: [{ kind: 'junk', count: 4, size: '1-2' }] })).toBe(4);
    });

    it('measures the largest datagram against a path MTU', () => {
        const recipe: Recipe = {
            steps: [
                { kind: 'packet', template: { kind: 'hex', hex: 'ff'.repeat(100) }, hex: 'ff'.repeat(100), seed: 'x' },
                { kind: 'junk', count: 1, size: '40-1400' },
            ],
        };
        expect(largestDatagram(recipe)).toBe(1400);
    });
});

describe('combinationNotes', () => {
    const sip = (method: string) => ({
        kind: 'packet' as const, hex: 'aa', seed: 's',
        template: { kind: 'sip' as const, params: { ...sipDefaults(rng()), method: method as never } },
    });
    const packet = (kind: 'quic' | 'dns' | 'stun') => ({
        kind: 'packet' as const, hex: 'aa', seed: 's', template: newTemplate(kind, rng()) as never,
    });
    const said = (recipe: Recipe, match: string) =>
        combinationNotes(recipe).filter(note => note.message.includes(match));

    it('says nothing about one kind plus junk, which is what the presets are', () => {
        expect(combinationNotes({ steps: [packet('quic'), { kind: 'junk', count: 4, size: '40-70' }] })).toEqual([]);
    });

    it('catches a SIP request and its own reply sent from the same end', () => {
        // A caller sends INVITE and receives 100 Trying. Both from here is not
        // a call anyone makes, and the shipped WARP C preset does exactly that.
        const notes = said({ steps: [sip('invite'), sip('trying')] }, 'not a conversation');
        expect(notes).toHaveLength(1);
        expect(notes[0]!.severity).toBe('warning');
    });

    it('leaves two requests alone — only a request with a reply is the problem', () => {
        expect(said({ steps: [sip('invite'), sip('register')] }, 'not a conversation')).toHaveLength(0);
        expect(said({ steps: [sip('trying'), sip('ringing')] }, 'not a conversation')).toHaveLength(0);
    });

    it('mentions a chain that imitates several protocols at one endpoint', () => {
        expect(said({ steps: [packet('quic'), packet('dns')] }, 'protocols')).toHaveLength(1);
        expect(said({ steps: [packet('quic'), packet('quic')] }, 'protocols')).toHaveLength(0);
    });

    it('does not count raw bytes as a protocol, since they claim nothing', () => {
        const raw = { kind: 'packet' as const, hex: 'aa', seed: 's', template: { kind: 'hex' as const, hex: 'aa' } };
        expect(said({ steps: [packet('quic'), raw] }, 'protocols')).toHaveLength(0);
    });

    it('counts datagrams rather than steps when the burst gets long', () => {
        expect(said({ steps: [{ kind: 'junk', count: 9, size: '1-2' }] }, '9 datagrams')).toHaveLength(1);
        expect(said({ steps: [{ kind: 'junk', count: 8, size: '1-2' }] }, 'datagrams go out')).toHaveLength(0);
    });
});

describe('recipeProblems', () => {
    it('calls a size the core cannot parse critical', () => {
        const [note] = recipeProblems(junk(1, 'wide'));
        expect(note?.severity).toBe('critical');
    });

    it('says nothing about a recipe that is fine', () => {
        expect(recipeProblems(junk(4, '40-70'))).toEqual([]);
    });

    it('flags a packet with no bytes in it', () => {
        const recipe: Recipe = { steps: [{ kind: 'packet', template: { kind: 'hex', hex: '' }, hex: '', seed: 'x' }] };
        expect(recipeProblems(recipe)).toHaveLength(1);
    });
});
