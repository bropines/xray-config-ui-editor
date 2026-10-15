/**
 * Known answers for the keys VLESS Encryption uses, taken from the real core.
 *
 * Each row was produced by running the released Xray 26.10.10 binary
 * (sha256 accbc95197799903338d59796dff54f79e854cea6cfc87be9c9949211f9a96e6, Windows amd64, go1.27.2)
 * with a fixed input:
 *
 *   xray mlkem768 -i SEED     prints the ML-KEM-768 key made from the seed (Client:)
 *   xray x25519 -i KEY        prints the clamped private key and the public key (Password (PublicKey):)
 *
 * (main/commands/all/mlkem768.go:29-60, curve25519.go:12-62 on the same tag.) They are data, not logic: a
 * re-implementation that disagrees with any row does not produce keys the core accepts.
 * Everything is base64.RawURLEncoding, as the core prints it.
 */

export interface Mlkem768Vector {
    label: string;
    /** The 64-byte seed a server keeps. */
    seed: string;
    /** The 1184-byte encapsulation key the client keeps. */
    client: string;
}

export interface X25519Vector {
    label: string;
    /** The 32 bytes given to `xray x25519 -i`. */
    input: string;
    /** What the tool printed as PrivateKey: the input, clamped. */
    privateKey: string;
    /** What it printed as Password (PublicKey). */
    publicKey: string;
}

export const MLKEM768_VECTORS: Mlkem768Vector[] = [
    {
        label: "all zero bytes",
        seed: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        client:
            "JUp5eIXGOxRAqjicZTQO8zUgzAOaqNdJrnCVuoSFokRPgHAHQTJ8NjpFe4U4sTtu1vE8KbIyUYxwThKGp0hn06q2ByldGnSDh2WT3OgDsfpCZWy7U1Ux07dtGPkw89Gd9KAtTGiI1VlrP7OCJXpB4-JS60hl2RBeh9eIj2Q0hfWzAL11XicF6dNmxzeG7acdELFRZGHI0cuRz5chSYZyEoyTXgRRLgciN3K4BocRI7CMQFmnp1QVxLqF_QdgPThhPgG5hnIDw6EqGfhO-5uOaXs1gUVYM8xIQ5UzUgytE7uwEXGGNkGzLiIx-IcOUGVbnCWMtUetp9eHIqzOWonLu9sWJzx3bHakU6p6HpOhA1CU6ftfeQl1VnE4QUHPwmgPT3dR-aHB37e55WNYHrl1JVWxqxhlp2kBI2ZKblYPhAe--GvE2hjACMaGSkdYvKYtpaGLqjMciXtJ_LAsK0cVIWMvWfHPAxZoYrEkoaw1gfO_ijUex5yHQoRjNksLO9FdNZdg2auPq7F76QeHQaGimvxapHh3Lss-M-CwgRlcEuXBWUNNKbwpqxINbRhOEWhG2oeba_ipuWcCYSYTqaohTkuit7G6f7QI0VQdiYO1Cgy7TghGfzVyxJtNyCqkoRqiaoUJcGibTumqlIe2DtZTYlcXhbRMPewygrmJeEOmjEN6LDgbZglf_3lZf_EHzcsYE7EA7aI9vfaiOfQEtIpX2mYjS6fAcPVp8Pi54SWsiIcH8XB9K0ViiTon5NxbqRtytltzV7pcPDOf6pw-eLQh9DHDFEIeURdoNOWeK4mamcOOSEeS07woc-h4QtPFX2hKSpQMamOioWij6zNo--g_jeU1JOeHwYJCGrKGF7Eg0Al4ERu1jgGw77Rj0-t2n8ZuSlm5Svanq-RU6WCuPgs7TmuRO7c__HsrNFN3uSUbxmE6dNAYd1QbjMMTjymabycoquuJxdIIo0cfcaiGSpvMUwWAJRpnQVNaYtig4XGBK_mIRqKEBXBJnbQZMmQEiEh7EIxy1Ct6fcVEuXGjL9qAZnactHAJBeImW3pDcNjAPuJ_jBl2pJnBNMglEkE3ePiEsXcannmHMhiQxkqhnNePTRkj9ZSUSASPpecTWpND22aR5rGAVneQRGZxFfvBRDtudKkjJ5WGzydimuKFyhAOEGLM9WyWudcg7akugbiuGZSlCFiKUDMPc9RvmYGZ9zhwEUak3bQeeFyYj8UetxuOSSdbf3ul5ZMArhLKD9FS0DnHbfBSbONNvquhfRGmsAYMphQBzsNf6bF14nUXpBxLigcFb8EOxvYmd_YrdoQL2RqVIMSoGcg9gEMJQSR6WWRilsy-p9waswFw3jhiTooztMK6Lcl79zpx2aw1pICoPxux4cR3dAnQoGV4KhpwewaNS_IgUQEgL8vHGrlLKSnLROLFR-wQtactjIdZ-ykgrcgLhXE5dUFLeyC5g-hI06DDvEM7vya3AKGkAyKoTeXIfrmHetaKvpiG99tpiZZAAupWbMYWRjsX4OeD5aliF6IAbTrkBnY8UEV9FIFAKq_H4j9D-dHXwK9wYKwdqp7LDmc",
    },
    {
        label: "bytes 0..63",
        seed: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0-Pw",
        client:
            "KYqhDUI8jdoGnQK8WebN8DoJa4s9pMq5uAykoUkHZyzO8exPryNKC8W36dRz8rMTOzsmodF1y2engFkZaZwC92UxuZxfiRgHBLtMpFNcW4lyZ5xmCgfF5RS4cAnIYuuPUVdpXvs_xAqd72uBwcwCokmuTwlK0Nm9NIXBwcaAgFIKfIxjIDLO5zgVTlxRdsB9pWAkd2pDD-durPZlo_e4MhAiFbyC8Qk5yDVXBDNqj6wdgeS7BIWqXXx01rWbvlxelyoNi6xBG1W11VV81oChqPcbTrhrxIyaBQlzGlS9nXKQsnlj5DctybGZz9ysCwGs0opiOVES5MQ2SNYixIyCNNAUQOjMN2ySfyOlr8msBHTGYidOQkUlyFUuzjs_4mUW3pAbx9UVveiVWOYmyVyAuTNC-AEABPOebGyUhxxeNEyrOWbINfmpalmv0xxAKGs4scGnhHC6uUdRiTRFPOhnNqkZ8fWm1RCob1RU_DmAy1x2W9K9X3s2sUENZjXIzrR8TdoNdqKOrJOcccMCSASGbHFiZlhEIWPCwiEX5QrO_OY3iphWUjAqTvDCzgzHFrd5bitrLjd336GsPaJZoxtam1MPjLY4qBpirDAYSauvlacwG9owBokJv9t-Z9vMuzilVRolsaOg9oV0itV1PYiA8AFsYnSGFmOExVcf4jZZADZNA4MR4th12zZmhpMrXsYCQwo2noem71wzh4ZleCW9TAV6zrkj6wk15pBeY7TO1_gIV6dz3WSxUNJmEuqawSBS2yAXvxhDzLSzKBtpDccorfqFwAKBuOPAkoczX4VrT8KJL2mi9XkhraAZFMQJiGYtV3aWYqeGNRubZkk9q3lZTZht4hANZboP9OpYuBU40kpENaJY-sJUBKp_QfZYsThQZeFY3LYBFXMnIPQEWaqsFeQGlTqQrFKZfRzNBwBg78ZdueZTNURn-tVuxxPIbnVAxCOs8mafUvpvSsaIjYce8-hHwCmoqvu5LheySqB5sfQZumF1tEKvsRkJ1KVrcKAzWyhzkhiqfJNI4sPC8-s9FaQeZBfA3ZS_6yFBmzEae7E6GAu-gzIYqaaxdEfMhfIlhZWHpzB3BJrLz9RNDwJUOOFdFTgnDVhuG_gxkqlFnPY8DpcvhSl2eYMezxIVCYUcuDQPbxB7D6Gg79GzaoGJvAhcT1y3hOVT9BuRj4A5fOGVb3hb7jd8qaqL5pmK2jDCa3w9jGtVJUzJYgOyDEKu4KxOHrtAjkmp4_h50KsHhetwJUJdEwWiKZwBXhINFjsOGUlM5XJT0CRtGCdFy4GXq3Q4s8G7eXK-xaMG66NWeFXAFGmf72WuVMdwoNhcGEAM9kKu3GYHd7pLE4UCvVp4EvYh-EpIKWuY3UMitvFYKLio8OAKi6RKU8OosUNXGwdAq9Vn2vHN6cecIEttXiWdF2ajG7vLTmoFz0UCF2swHBwvQSR3UBV7zshegJswpNYNd0fN0PW5mqjIJph1F3k6qoCAoLEkqFWN9yu-N7dfTtu2voIW1sYz-ysigOJRE9hpXkNIHD7rOX6xklBSKbZ6IB6ok8PiyzLai8NC-k3qBXg",
    },
    {
        label: "all 0xff bytes",
        seed: "_____________________________________________________________________________________w",
        client:
            "Mgd-V_m7Mlc_h9duvqwgkASe1qslM0eHhsY_PApE1JwcVOGqZKwzl6YqpmRHl8k2KfBfWxvKRlABewWhNkqX_2U7eGh_4RbIU7OiIlyIQVSOLya9YSOnvUilrfa1W_xSnQInzOm83RJ_XcOPdfk6bsVxyiLPqDlWM9IPVjg4unyECUBAmvRY8timbCITzVBWxkamMtOj80I1hooUO7QvdxtgLaZiy9nKTvlBRgp_NMprlWI5KNNMsownZ_gQtzNbznlt6GMFNkF_OFKj9vdP1RIpJUEOrhN4mtedoSCelPWjDAtXE3tciLATbIWapKNOeJdyRHV6TyYDpQZlDNWOwZaFWbN6xJwubvIHnlOLEceU5gKC5qVfYmzHW9uzImwKk9wf4-Eafou1QpgsPEtfYsqMmHBb43RNE-afAKXB15GtM9mBCyZM5IVhhkNrcNcmX-IB_NUTJNR5WTiAtXkn3eKV1zomJ2ysYZSyHCw9U_lJVlUqj3emIMadRbYUFgecRxCK_NN2_cN0FmOLsXZSonUyd3KkW2MS3BuNCBFq7oaFR9YufDGmDrO2MAgaZcuoBtpSIBM1DNiLdActCSVEBCWgJcRFLPCbM3UEJ-cGORG0zXVtXcx0zlOnM9kPsBEgiYFbD2kd5fxiU-aB-HMVKbwdZ7oEFyJSbCpzFUtA95CZvJhOp4pwIyJCYVyHYPWO9jkifHRkFhNxDaAr8OsZGAKM8cPCU-x4yIS4PxmKwTufhleAeneZ9WBHDnF78fkURaWkEWh3VMhC0xioYxItsXFA1iOEV6INeJlfOKFgLAZGgzIixmzAbIWMPagYN0Wpu4tDOvkQ4nZlw9o0byPM0ilIu8RaT8WhUfLFFjlA-DKfeilqXrvMlbm0DHiEdHlA8vMibLq0kAFHFkrMHcdWZVmhqlAqhaRivwXLHwfArifG4HuJI3IrggwVpYSKSUGhMLO1YRhYE4OehCgu3phjCpkjw4ANmfRhnwwZpXKUgxWtF7geT-pcIoFtqwqiwHhTYstdP4wtVfZn72AEDswUnIzGdfpl-QGfl7KXV3M6uae-J7YIYNuEgEgKCeehONpfSQTGs0pbt5SpY2WYHuVLxsOyOZgQXCWl9bo6OkB5cPsqbmwwAmMnjfAoMEhHBpInKZsfs_Z8OLhIh_F4OlcttXoFWLET9REz2zpPnvx8bLsIK1JpQ9uXCLppeieZUaKngauiNAukVbtGNUSsKAAty4c83iwclPKdmNa3qaSmv1Vm4seOR8l4YLgbVEKW8BknWVVobpSMCZsVnchpKogYxMi_dFDF_5a4asQJsQKr3skCB0Be5vPGIhFzWojA_VsXHUBFlVetVVua2aBRzVKyRoq8u_OEngCtAYUrG-OsCRoQmMNNDZkPkplRKFADl7lsHHiuuvgjS-IGbTCrOwlS1FYJ0XRZh2kDEJYD64SgYhgwYTqUlUFsmfMInzLF89MwJearM3YwDXC5LhaG9QmwQsyGY_G8Q3a_-miLxRo7AuqDlSmvWhBLvEJ_tinEScpVxaok82ZnTTc86OGeuMvoCxXV0Qy3bgc51JYFylLPS3Y",
    },
    {
        label: "(i * 37 + 11) mod 256",
        seed: "CzBVep_E6Q4zWH2ix-wRNluApcrvFDleg6jN8hc8YYar0PUaP2SJrtP4HUJnjLHW-yBFao-02f4jSG2St9wBJg",
        client:
            "ptUQrOB7vBoMNDXAsRIhq5zBOuAiS-GN8QbGTthglwQrtnnCHPI-MaIO7GdjbkMfQpBbFvEcBzoZ9LofAcspTnW6JWh5uCxpBca39sVokby3jLWXXnJWyeLB5lk7tnWFalCzDhmEY4wCYkTPRdjOLxWf_QZwCaFrFjmEvNtG-_B0Ppd3yZlfLVYh4na6DuUy0QgCgxGBB4SsxPol7uh1SlKfCvamahW449uq4_iDGuUgn_EbZpQe3WRmxRASMARqjkyUjPcKGivGHNGD9Qaiz_oGt_lFmxK3S1K9IkKDIORD-GWrhuTMhJav3suFfFPN14nLIJhmsxMiIsq1R2Q6pNtYmGIPc1Fy-9CbMACvuOaLuamaiwyo0RBWw8lR_JaBVlJZnqd7IIo6cTNFu-Y02SRpsslmyxJp8sEA1leazwBm5YgMYiJ-sZRDT2R9BnI3couNHXyeU7aL39B629XMCTpYTlJDwkk3GhVFxjh-Z_CWvkO2LoiNjPKDHMXI6DiHFXs5KcRXK-kG3sLEc7O-7-aPXTGrP1tgQdqPAmUgwRE815ER1KSk2GmDU8t54pOPfPmyb9uQ1JxXkugSWzWp9luMH8p-CspgzhY9szQufPlBh2LAHyZh-FRFXUcjfCEwRSJygAYhYVkDttAFd8yHKvwfEDA7vznIZKKhyhFDZXF2GiBOwUOXBCAvujYwFPiNkwQMwJUkSUo7hMcEQCxuiEBOsRYurTBGEPwwfamxAPWnOgFLpaIaZtprmMUovgUOKHzPSKuA9EtkyluBVMpFtqAsWdZpWbWDVcxC0ENT6aiG0yq-R3dH9-FgMyq116mOKPo2BpEU3ShiFAGAPweXtaVkhipuh7YO-fu0_eV5CMkPPbZTpjyFaRWunqM5DgBqPIRf8dqBEZKaAkyjg1AsYHG0-gIaJlV-ZDQCR_KLN8mR7OOp3BS06YIApboauGWdRwUqTSpozzQ_buQywyZKC-Sbm8N3RFpsE_mUSca6exgJDUVDF5hTeKFfhwML-AAdCoiy3NOhWnqtgZbDv3RBQBaEbIJeoLhrYeob8haludGxtFSZvacspoANG-WbBxkPRkG1q0AbygF5sVkRX3UJpgut2KJ0bscLYWI_n_lrS3UAjBZ1kyBlZuBt7myjTkFc3csOz3I70kan1eSrMpZQ0FdqKrcJGxJu2SQfAwtfF-NItRRw4MmdFoxA_6Q3ZsEYNfC5r5OgQlBDrhGXKPA5oGFDnMcNtuq70FEzHfyvZtsHdVBCaSrBARS0NBESbWVB5EVI5fI2UFkHk1VI5NSibuEnU0sbWWjKQOMyULvB3SwBKqI815dMk2kBX_tahgBWAIYAouyk26GA8um9qFQzhgPFq0cI-DtEllyXhPYhR8laJaax97KVIOMLC0G4lsqgfJg-LUWAQYInOAqandQuzZWzebqNlYhRANIwSUNuL1jBVTqTRJQTMqpA0Dg6nhwKNwiO_7Yp6Qlx0YQ_j9BC8WGtFNQUdjuCftpImzln3rgZV8kuv0sl6-x2pbConmtERrbS48OLdezhZjGKxjJnYZRyB0Ko9i5dHgTHyeA0YHI",
    },
];

export const X25519_VECTORS: X25519Vector[] = [
    {
        label: "all zero bytes",
        input: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        privateKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA",
        publicKey: "L-V9o0fNYkMVKNqsX7spBzD_9oSvxM_C7ZCZX1jLO3Q",
    },
    {
        label: "bytes 0..31",
        input: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
        privateKey: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHl8",
        publicKey: "j0DFrbaPJWJK5bIU6nZ6bslNgp09e14a0bpvPiE4KF8",
    },
    {
        label: "all 0xff bytes",
        input: "__________________________________________8",
        privateKey: "-P_______________________________________38",
        publicKey: "hHwNLDdSNPNl5mCVUYejc1oPdhPRYJ06ak2MU66qWiI",
    },
    {
        label: "(i * 37 + 11) mod 256",
        input: "CzBVep_E6Q4zWH2ix-wRNluApcrvFDleg6jN8hc8YYY",
        privateKey: "CDBVep_E6Q4zWH2ix-wRNluApcrvFDleg6jN8hc8YUY",
        publicKey: "Xp00K3yp3XSDwWF8jQfD6Zv_IchVqJlR5UjIXfl1uU0",
    },
];

/**
 * What `xray vlessenc` itself printed (the same binary, run twice), as pairs: the
 * server's `decryption` and the `encryption` its clients are given. Deriving the
 * second from the first has to give exactly what the tool printed.
 */
export interface VlessencPair {
    authentication: 'x25519' | 'mlkem768';
    decryption: string;
    encryption: string;
}

export const VLESSENC_PAIRS: VlessencPair[] = [
    {
        authentication: 'x25519',
        decryption:
            "mlkem768x25519plus.native.600s.2NJteh986jJpKt7EZnpNtecdkIYQv7jqF_6K8pqbR10",
        encryption:
            "mlkem768x25519plus.native.0rtt._Rj518UEPwiehdSSqsDJcaneYI3QXdDZAA0BS1sa5UM",
    },
    {
        authentication: 'mlkem768',
        decryption:
            "mlkem768x25519plus.native.600s.YGSumRdVPnguEugKpSQS1SZmOazyZTNc8jA3dViUX_wrb5LmrwOg8Ar4raBc1V1sA67hkesRhm2EzEsFxo0ZHw",
        encryption:
            "mlkem768x25519plus.native.0rtt.9pe_6yF6J4DDHFuSspXNydQAZdZk7ccXFOALKYGAdnsQ5WfKTJgaqfiQB-po0OsA_AghxhCdskO4_zsVR5jImcVSovej7je7zxEP71eZEjeJITdwPqgWWfWj8FpuzlB2ecgeDzmm5JA1NHqjOjHBfIZ8pFpOtyEe11mHUMgaTsh2JUPFAMZK9FUe15CGORuOkXGy-FtxCYWiHfpDepZh1XGvD-Z-wyYoN6gVBaufDJQ8H5rDWzpMXnaNOeEnFYuspJsf7sZZGiVPb8GaM4eG4VM73jzEtyOI5WeVQ1A9sXKYY5IXB9pDsDEwSHTJw6Qd6ONK6zt_E5OCDUioWyRzk_E6YgrKmYIvmapixbNBEApBlgE4sOrAWoKBEdQnIDmoavZF3DIkKzfJ1lRaWXWURThASrXDQ9VgrGeP07nCEwic1rTPnNOzkZhyeXuuGmRQjRZF5WAOimDMyHccurCFX5BkaVu97Mh868ZzevQ6gyXBlPifgmsAlWAY8xQVUSIHECVQHzGc2DMOtMCt3XoBYojFOyDPrbFw1Ik05VRp2DFNz4ZpgHRQhRdGCxgLzkhQu2XOUFgewrdB-9GOWQMunXcPGtPMKiGgQbFDAeuHETsS3hlU2gDK7nIuMscHduQaF3S53qkkq_Jil6KJ-LJrhbEcZWNx8stYB3s0vWYDEBkWOZU5hrGXVVBGNpyk1UwYaJyrrEde30mnlGqhC4QmLUA7BjYRjKGcbAMySlMhZZg4igybMfCcRDARBcp7HFuwcUYvCGTOjelxzoqhXYfBHnsRv9lHfvo0P1CNJpgxljyNbNlqVnmIiASrt6oVmlerClNdIyGrrcNZ7uWXrjiYrpVdQXcM8QW3cNULF5qQdnkLJ5UcCAQqEKFEQYyL_DZgamghBhW6fjZAWrEH60Atvtxsx4I7ipwtrWYmLSNbAwW1gUc7SMB-zAkXeVRMl0Ok7cGnNeRSO3CB52mCc_VSfrkLHwU3tlkZS1CTdUW5qgsbltc-OscXPLoTPaDORFnAA2CFZ9MMmXdmZkxpTYKSC2GFq6Szv0y9HjM6exKrYQK12hArHQcqczI_dwWeE8UfyTqmgIUEc0ZOLlpEZTKRxIFLhjo70HgqJ9qDwku6N0snywQ_t-RLbxWtH9Q91PSKsQOHR1QYiZxga6q-eJViVImE59SvquSFLWFYwOw2V1ZYfSi6g6YYTUoHqZcQJZOHpmIUFIFEEjDPtYNm19fCf-qKEsYHdshAc0edRDdcy8Cml5S2JPEjLgU4NxiyblMvJ7SuVtd0jSw2AnOjOPiJgCoMSwFVpnVfsOBexrBCS7QL17dKtpwU8IekRhWocwY9YiYDgkpRIUqkS-JxhlGrOdpeh1Obh0Ys3dlwZUIQ2ik3M-uDZoCvQ_MMsWhr1dKHk6jLCbKfX4ZvjEPNNZsvahhvNffOTsMCwVFtQzw-J1E31piJ_bWVrkCkqJIzjfrNsKWUApxhKbqflwmzbtwhBSMlUIkDnzCDkjcR1HZknNY0hjDP2spzQjen4GWj5Rku0kHiJte7IQJMNIkfTNRajpESaB96eL9Nzi0h0RiO4GQ",
    },
    {
        authentication: 'x25519',
        decryption:
            "mlkem768x25519plus.native.600s.UGyuAdxbY8NUlpeDS62scW3fAkf58R6CuoE1U_Awk2A",
        encryption:
            "mlkem768x25519plus.native.0rtt.SAaYwu3uRYEScyDX-_HYp__F_DdOXRI8vAOXck7wSn0",
    },
    {
        authentication: 'mlkem768',
        decryption:
            "mlkem768x25519plus.native.600s.Mwr9mujm-rgjOoObDwbKOTfAFC4XqRoLJ2o5RdbKgal1X4pZFzRp8-Or26qOJrdMd5cXIpi_ciQ6UgEGp65FDA",
        encryption:
            "mlkem768x25519plus.native.0rtt.LCAdaJiNh5gLynwUstYp2YGz1PCeQJXH0SnAdHZEPCfFb6xUZZMU7xFOOlCRzmNxgUwS8rMAKiyNyDWdqNu7U1qXgHwR5bbEYbpqdlBlTCKUqDIJHeUUBac9PIWLgEAUhWU1EDOvJQJMbtajjCVD3RyEOcGQgIF3BGBZ7aJyVOYxp5B7q0QXT1vKjzIpcqAz_NyJF1h8Ico4hZi-jNs-VkSW15CaQpQeHfkqiNN_6_EXkcpbMgJ_43WGnlwu22le50ibTkd5CjpYetBwt1Zyc8h7OOwt9fxATSNvsqYrsWQoQtVqafcqb8CigTOqbUex4qQeMJsk0FUDlbQI7Dy7r8qGjHG0B-ux7QSu3AANV4iA7GoL4TESYNMMmIURB_wYuvTIEgEwkMef7de9UiSaHjvNlbc_zRkqvdpPqcF6gpG6PvsLUFofGvJn0BlylgoDBFgWilmXXMKTJkRLONeEywJcttxp6BBAVuKCCTy3HIxvQlUnpjJVPVUz-rkl1gHB9KGtq_IKDEvBXKtztZVp6LSYNPECfEZILZOOz0VVq7sPdkA9bzd3WIdfSbquR8UBxmEUeppXKnmdBGRrZmO520u6SgcS2oPDJ8VR5HsHTMcT0srC05evmQStU4VcNRoicVkjZWZaO-Rb_HVohMpzx-cdi-u_V9YldsiHU0k8f8hVT9WLQYcY0TVt3nBVEzlv4EMW7US5tEQMPdkdb4Ex-OjLMMdjwyu5BKnAJHGp_cWLAnewTSbHtJgMz4s_fMZ3xCA9lUSd2CoQMXRgTOmwOVYcKEXNGUx7TQEBI3RKsgqrM8NeQlsyPKtkBIgR3cleAwp0OBVJjkEDq6Vsk4UJ-ZNXlDGgVjxTBJqV-NBwCFYZJrWTMRDN65wkBmQZRPl6PzqKkXzBfmx-1fO5FXVJJuUZHEkb_WeTnJud3bA0GgUzkod6NOaWVQJKdJKbzfCOypccJ8S5IFRjvrTOXsiAvZM8ZQYOfuY37YtP3Ie_r2YdZbm8ncguv5yN0_RDAxQN6Ci3vgEfa9ByhMNbI1kAlMl8qQdyfbvNgpFq-9uhgFA41ixqjeto8pwANmAWWqzGcfA7reoey7YedxGd4Bt-zyZrq9ivwZaho1VTstmGtkVS0tQAgSOcpIAtZlYi0uOww9s-6XMHD4DI0qeuu3MyzATOlOMcMwY6EfUVR6xAVlVyruCBk-YHqcbCQjrEqdQJv0OV-6TAeuUxDvGs2kwpM6ttNXSndRAd--eu-seDSfRyE8MeY5pJ88GhDbNhQyd9CmUyLHp24dBTino8XeQPhwS03GqlRDd46hNwxIaN46EUIze8t3y1y4mR9BfPDMsn3eqApkZZcpgWNomyWCkFfHM3f-ZUfKdx_iW09AlvYEWO0taghlENuRt_XliGuYwDxxnC5jxPmkszHJBOOIsr6fu6gXAEI8iRmXs-W-YltxmeIASE4gQzBOeIrmLDjCxwdZWEBfd-HxQFWaJxdXOUTdIpwEwYPVpPj9B21wtDv7uhU-wF7uoDYxlB3eKkwtyERHi3vH89UbZ512Yp3XV3Ou6J2lXuDH_p6vOdmFTfEm0",
    },
];
