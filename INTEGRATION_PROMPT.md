# 🔗 Задание: Интеграция Zod-схемы в проект Xray Config UI Editor

## Контекст

В `src/core/xray/schemas/` создана **полная** Zod-схема конфигурации Xray-core (50 файлов, 1790 строк).
Она покрывает ВСЁ: 14 секций конфига, 10 inbound протоколов, 12 outbound протоколов, 7 транспортов, TLS, REALITY, sockopt, FinalMask, XHTTP (с xmux и downloadSettings), FallbackObject, и обратно-совместимые алиасы (tcp↔raw, ws↔websocket, kcp↔mkcp, splithttp↔xhttp, dokodemo-door↔tunnel).

**Алиасы**: `splithttp` = `xhttp` (одно и то же, xhttp — новое имя). `tcp` = `raw`. `dokodemo-door` = `tunnel`. `ws` = `websocket`. `kcp` = `mkcp`.

Сейчас схема **создана, но не подключена** к остальному проекту. Твоя задача — интегрировать её.

## Стек проекта

- **Runtime**: Bun
- **Фреймворк**: React 19 + Vite 7 + TypeScript
- **Стейт**: Zustand 5 + Immer (`src/store/configStore.ts`)
- **Стилизация**: Tailwind CSS 4
- **Иконки**: @phosphor-icons/react
- **Граф топологии**: @xyflow/react
- **Модалки/редакторы**: `src/components/editors/`

## Что нужно сделать (по шагам)

### Шаг 1: Заменить старые типы на Zod-типы

**Удалить**: `src/core/types/xray.types.ts`

**Заменить** все импорты из `src/core/types/xray.types` на импорты из `src/core/xray/schemas`:
```typescript
// БЫЛО:
import { XrayConfig, Inbound, Outbound } from '@/core/types/xray.types';

// СТАЛО:
import { type XrayConfig, type InboundConfig, type OutboundConfig } from '@/core/xray/schemas';
```

Найди все файлы с `import ... from` путями к `xray.types` через grep и обнови.

### Шаг 2: Обновить Zustand store

В `src/store/configStore.ts`:
1. Заменить все ручные TypeScript интерфейсы на типы из Zod:
   ```typescript
   import { type XrayConfig, XrayConfigSchema } from '@/core/xray/schemas';
   ```
2. Добавить валидацию при загрузке конфига:
   ```typescript
   loadConfig: (json: unknown) => {
     const result = XrayConfigSchema.safeParse(json);
     if (result.success) {
       set({ config: result.data });
     } else {
       // Показать ошибки, но всё равно загрузить (passthrough не потеряет данные)
       console.warn('Validation warnings:', result.error.issues);
       set({ config: json as XrayConfig });
     }
   }
   ```

### Шаг 3: Обновить валидатор

В `src/utils/validator.ts`:
- Заменить текущую ручную валидацию на Zod `.safeParse()`.
- Для протокол-специфичной валидации использовать соответствующие схемы:
  ```typescript
  import { VlessOutboundSettingsSchema } from '@/core/xray/schemas';
  // ...
  if (outbound.protocol === 'vless') {
    const result = VlessOutboundSettingsSchema.safeParse(outbound.settings);
    // ...
  }
  ```

### Шаг 4: Обновить StreamSettings в InboundSchema/OutboundSchema

Сейчас `streamSettings` в `inbound.schema.ts` и `outbound.schema.ts` — это `z.record(z.string(), z.unknown())` (для обратной совместимости на этапе создания).

**Замени** на реальный `StreamSettingsSchema`:
```typescript
import { StreamSettingsSchema } from './transport/stream.schema';

// В InboundSchema:
streamSettings: StreamSettingsSchema.optional(),

// В OutboundSchema:
streamSettings: StreamSettingsSchema.optional(),
```

### Шаг 5: Обновить редакторы (editors)

В `src/components/editors/` — модальные формы для редактирования inbound/outbound.
Сейчас поля формы определены вручную. Можно:
1. **Минимальный подход**: Просто использовать типы из Zod для type-safety форм.
2. **Продвинутый подход**: Генерировать формы динамически из Zod-схем (через `zodToJsonSchema` или кастомный walker).

Рекомендую начать с минимального подхода.

### Шаг 6: Обновить JSON-валидацию при импорте

Если есть функции импорта конфига из JSON-файла — использовать `XrayConfigSchema.safeParse()` для валидации + вывод человекочитаемых ошибок.

## Критически важные правила

1. **НЕ ТРОГАЙ схемы в `src/core/xray/schemas/`** — они уже готовы и проверены. Только импортируй.
2. **`.passthrough()`** — все Zod-объекты пропускают неизвестные поля. Это значит: если в JSON есть поле которого нет в UI — оно СОХРАНИТСЯ, не потеряется. Это намеренно.
3. **НЕ ДУБЛИРУЙ типы** — все типы берутся ТОЛЬКО из `z.infer<typeof SomeSchema>`. Нигде не создавай отдельные `interface` для тех же данных.
4. **Алиасы протоколов** — `tcp` = `raw`, `splithttp` = `xhttp`, и т.д. В enum'ах поддерживаются оба имени. Не добавляй свои маппинги.
5. **Старый файл `src/core/schema/xray-ui-schema.json`** — удалить после миграции. Zod-схема его заменяет полностью.
6. Используй `produce` из `immer` для мутаций в store. Не мутируй state напрямую.
7. **Бинарники**: Никогда не коммить скриншоты, картинки и прочие бинарные файлы.

## Файлы для изучения перед началом работы

Обязательно прочитай перед тем как начать:
- `src/core/xray/schemas/index.ts` — точка входа, все экспорты
- `src/core/xray/schemas/primitives.ts` — DRY примитивы
- `src/store/configStore.ts` — текущий Zustand store
- `src/utils/validator.ts` — текущий валидатор
- `src/core/types/xray.types.ts` — СТАРЫЕ типы (на удаление)
- `GEMINI.md` — правила проекта

## Проверка

После завершения:
1. `bun run build` — должен проходить без ошибок
2. `bun test` — все тесты зелёные
3. Загрузить реальный Xray JSON-конфиг → он должен парситься без потери данных
