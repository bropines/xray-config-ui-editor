/**
 * Russian translations, keyed by the English source text.
 *
 * Terminology: Xray's own vocabulary stays in English (inbound, outbound,
 * sniffing, fallback, sockopt, REALITY) because that is what the config keys
 * and every guide call them — translating those would make the UI harder to
 * match against a config, not easier. Everything around them is Russian.
 *
 * A key with no entry here renders as English, so this file can grow without
 * breaking anything. `i18n.test.ts` reports what is still missing.
 */
export const ru: Record<string, string> = {
    // ── Common actions and words ────────────────────────────────────────────
    'Add': 'Добавить',
    'Remove': 'Удалить',
    'Delete': 'Удалить',
    'Edit': 'Изменить',
    'Save': 'Сохранить',
    'Cancel': 'Отмена',
    'Close': 'Закрыть',
    'Copy': 'Копировать',
    'Clear': 'Очистить',
    'Refresh': 'Обновить',
    'Apply': 'Применить',
    'Done': 'Готово',
    'New': 'Новый',
    'Back': 'Назад',
    'Rename': 'Переименовать',
    'Switch': 'Переключить',
    'Active': 'Активный',
    'Import': 'Импорт',
    'Export': 'Экспорт',
    'Fetch': 'Загрузить',
    'Parse': 'Разобрать',
    'Duplicate': 'Дублировать',
    'Confirm delete': 'Подтвердите удаление',
    'Optional': 'Необязательно',
    'Auto': 'Авто',
    'Custom': 'Своё',
    'Simple': 'Простой',
    'Advanced': 'Расширенный',
    'Search...': 'Поиск...',
    'No options found': 'Ничего не найдено',
    'No matches found': 'Совпадений нет',
    'Filter tags...': 'Фильтр тегов...',
    'Select time unit': 'Выберите единицу времени',
    'Time Unit': 'Единица времени',
    'Copied to clipboard': 'Скопировано в буфер обмена',
    'Copied to clipboard!': 'Скопировано в буфер обмена!',
    'Copy failed': 'Не удалось скопировать',
    'Clipboard is not available here': 'Буфер обмена здесь недоступен',
    'Nothing to copy': 'Копировать нечего',
    'Loading your workspace…': 'Загружаем ваше рабочее пространство…',
    'Loading editor…': 'Загружаем редактор…',
    'Saved panels': 'Сохранённые панели',
    'Forget this panel': 'Забыть эту панель',
    'switch': 'сменить',
    'Switched to {panel}': 'Переключено на {panel}',
    'Paste the token for {panel}': 'Вставьте токен для {panel}',
    'Remember this token': 'Запомнить этот токен',
    "Off, the token lives only until this tab is closed — the panel stays on the list and asks for it again. On, it is written to this browser's storage as plain text, readable by anything that can reach the profile.":
        'Выключено — токен живёт только до закрытия вкладки: панель остаётся в списке и попросит токен снова. Включено — он пишется в хранилище браузера открытым текстом, и его прочитает всё, у чего есть доступ к профилю.',
    'token not stored — paste it again': 'токен не сохранён — вставьте заново',

    // ── Token scopes: what to grant a panel token ───────────────────────────
    'Which rights this token needs': 'Какие права нужны этому токену',
    "Your panel can issue a token limited to a list of scopes. This editor calls four resources and nothing else — a token scoped to them cannot read a subscriber, reach a node's shell or mint another token, even if it leaks out of this browser.":
        'Панель умеет выдавать токен, ограниченный списком scope. Этот редактор обращается ровно к четырём ресурсам и ни к чему больше — токен, урезанный до них, не прочитает подписчика, не зайдёт в шелл ноды и не создаст новый токен, даже если утечёт из браузера.',
    'Read a profile and write the edited config back. Without the write half this editor is a viewer.':
        'Прочитать профиль и записать изменённый конфиг обратно. Без права на запись редактор превращается в просмотрщик.',
    'Read a host to mirror it into a client outbound. The balancer builder also creates, edits and removes hosts.':
        'Прочитать хост, чтобы собрать из него клиентский outbound. Конструктор балансировщика ещё создаёт, правит и удаляет хосты.',
    "Read and write the XRAY JSON a subscriber's client receives.":
        'Читать и писать XRAY JSON, который получает клиент подписчика.',
    'Read snippet bodies, and write or sync one when you ask for it.':
        'Читать тела сниппетов и записывать или синхронизировать их по вашей команде.',
    'Only importing configs to look at them? The plain scopes above are read-only; leave out every amber one and nothing on the panel can be changed.':
        'Собираетесь только смотреть конфиги? Серые scope выше — это чтение; уберите все жёлтые, и на панели ничего изменить нельзя.',
    'Never on a token for this app:': 'Никогда не давайте этому приложению:',
    'Give it a short expiry as well. On a panel too old for scoped tokens, every token can call everything — there the expiry is the only limit you have.':
        'И задайте короткий срок жизни. На панели, которая ещё не умеет ограниченные токены, любой токен может всё — там срок жизни остаётся единственным ограничением.',
    'Hysteria': 'Hysteria',
    'QUIC-based, with its own congestion control': 'На QUIC, со своим контролем перегрузки',
    'Removed from Xray — use {replacement}': 'Удалён из Xray — используйте {replacement}',

    // ── Core versions ──
    'What the editors offer and what diagnostics call refused or silently ignored both follow this.':
        'От этого зависит, что предлагают редакторы и что диагностика считает отвергнутым или молча проигнорированным.',
    'Oldest supported release':
        'Самый старый поддерживаемый релиз',
    'What Remnawave nodes run':
        'То, что стоит на нодах Remnawave',
    'Newest release':
        'Самый новый релиз',
    '{what} is refused by Xray {tag} — the config will not load.':
        '{what} отвергается Xray {tag} — конфиг не загрузится.',
    '{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.':
        '{what} нет в Xray {tag}: ядро молча его выбрасывает, так что там оно ничего не делает.',
    '{what} is deprecated in Xray {tag}. It still works, and the log will ask you to move off it.':
        '{what} устарело в Xray {tag}. Пока работает, но в логе попросят с него уйти.',
    'Use {replacement} instead.':
        'Используйте {replacement}.',

    'Checked against Xray {tag}': 'Проверено против Xray {tag}',


    'Xray {tag} takes: {values}.':
        'Xray {tag} принимает: {values}.',

    'A {protocol} outbound without TLS or REALITY to the public address {address} is refused by Xray {tag} — the config will not load.':
        '{protocol}-outbound без TLS или REALITY на публичный адрес {address} отвергается Xray {tag} — конфиг не загрузится.',
    'Set security to tls or reality. Private and LAN addresses are exempt.':
        'Поставьте security tls или reality. На приватные и локальные адреса это правило не распространяется.',
    'A blackhole response without a type is refused by Xray {tag} — the config will not load.':
        'Ответ blackhole без типа отвергается Xray {tag} — конфиг не загрузится.',
    'Set the type to none or http, or remove the response.':
        'Укажите тип none или http либо уберите response.',
    '{what} "{value}" is used twice; Xray {tag} refuses to start with a duplicate.':
        '{what} «{value}» встречается дважды; с таким повтором Xray {tag} не стартует.',
    'A hysteria outbound needs version 2; Xray {tag} refuses anything else.':
        'Hysteria-outbound нужна version 2; всё остальное Xray {tag} отвергает.',
    'Set settings.version to 2.':
        'Поставьте settings.version = 2.',
    'A hysteria outbound takes its server as settings.address; without it Xray {tag} does not start.':
        'Hysteria-outbound берёт сервер из settings.address; без него Xray {tag} не стартует.',
    'Move the address out of servers[] into settings.address and settings.port.':
        'Перенесите адрес из servers[] в settings.address и settings.port.',
    'A hysteria inbound needs version 2; Xray {tag} refuses it missing or different.':
        'Hysteria-inbound нужна version 2; без неё или с другой Xray {tag} его отвергает.',
    'Local OS (26.9+)':
        'ОС узла (26.9+)',
    'Matches the OS the Xray process runs on (e.g. windows, linux, darwin). Read from Xray 26.9; older cores drop the key, and a rule left with no other condition then fails to load.':
        'Совпадает с ОС, на которой запущен Xray (windows, linux, darwin). Читается с Xray 26.9; старые ядра выбрасывают ключ, и правило без других условий тогда не загрузится.',
    'Deprecated on {tag}: the core copies this into sockopt.domainStrategy, overwriting what is set there, and logs a warning. Set it in Sockopt under Transport instead.':
        'Устарело на {tag}: ядро копирует это в sockopt.domainStrategy, перезаписывая то, что там стоит, и пишет предупреждение. Задайте в Sockopt под транспортом.',
    'How a target domain is resolved before connecting. All eleven values are the ones the core accepts.':
        'Как разрешается домен назначения перед подключением. Все одиннадцать значений — те, что принимает ядро.',
    'Only Xray 26.3 reads this; {tag} drops it, so it does nothing here.':
        'Это читает только Xray 26.3; {tag} выбрасывает ключ, так что здесь он ничего не делает.',
    'Arrived in Xray 26.9; {tag} drops it, so it does nothing here.':
        'Появилось в Xray 26.9; {tag} выбрасывает ключ, так что здесь он ничего не делает.',

    'Obfuscation layers wrapped around the transport, and the QUIC parameters for hysteria and XHTTP. What is offered here follows the Xray version set in Settings: {tag}.':
        'Слои обфускации поверх транспорта и параметры QUIC для hysteria и XHTTP. Что здесь предлагается, зависит от версии Xray, выбранной в настройках: {tag}.',
    'Add finalmask':
        'Добавить finalmask',
    'Remove finalmask':
        'Убрать finalmask',
    'refused by Xray {tag}':
        'отвергается Xray {tag}',
    'Xray {tag} does not know {type} as a {list} mask, so the config will not load.':
        'Xray {tag} не знает {type} как {list}-маску, поэтому конфиг не загрузится.',
    'Convert to mkcp-legacy':
        'Перевести на mkcp-legacy',
    'Move up':
        'Переместить выше',
    'Move down':
        'Переместить ниже',
    'Remove layer':
        'Удалить слой',
    'QUIC Parameters':
        'Параметры QUIC',
    'Read by the hysteria and XHTTP (HTTP/3) transports only. An empty field is left out of the config, so the core uses its default.':
        'Их читают только транспорты hysteria и XHTTP (HTTP/3). Пустое поле в конфиг не попадает — ядро берёт своё значение по умолчанию.',
    'Domains this server answers for, one per line: example.com or example.com:txt.':
        'Домены, за которые отвечает этот сервер, по одному в строке: example.com или example.com:txt.',
    'Resolvers the client queries through, one per line: example.com+udp://1.1.1.1:53.':
        'Резолверы, через которые клиент шлёт запросы, по одному в строке: example.com+udp://1.1.1.1:53.',
    'Seconds between hops, at least 5: 10 or 5-30.':
        'Секунд между прыжками, не меньше 5: 10 или 5-30.',
    'Switches salamander to gecko framing (1-2048), which plain salamander and 26.3 cannot talk to.':
        'Переключает salamander на кадрирование gecko (1-2048), с которым обычный salamander и 26.3 не договорятся.',
    'One range per line; overrides length when set.':
        'По диапазону в строке; если задано, заменяет length.',
    'One range per line; overrides delay when set.':
        'По диапазону в строке; если задано, заменяет delay.',
    'Seconds, 4-120.':
        'Секунды, 4-120.',
    'Seconds, 2-60.':
        'Секунды, 2-60.',
    '(server)':
        '(сервер)',
    '(client)':
        '(клиент)',
    'Default':
        'По умолчанию',
    'not a value this version takes':
        'эта версия такого значения не принимает',
    'Not valid JSON yet — the config keeps the last valid value.':
        'Пока не валидный JSON — в конфиге остаётся последнее верное значение.',
    'Remove noise packet':
        'Удалить noise-пакет',
    'Add Noise Packet':
        'Добавить noise-пакет',
    'refused by Xray {tag} — the config will not load':
        'отвергается Xray {tag} — конфиг не загрузится',
    'ignored by Xray {tag}':
        'игнорируется в Xray {tag}',
    'deprecated in Xray {tag}':
        'устарело в Xray {tag}',
    'only the server side reads this':
        'это читает только серверная сторона',
    'only the client side reads this':
        'это читает только клиентская сторона',
    'older spelling, still read':
        'старое написание, пока читается',
    'Xray {tag} applies the first {list} mask nearest the socket; 26.7 and later apply the last one there. A peer on 26.7 or later needs this list in reverse order.':
        'Xray {tag} ставит ближе всего к сокету первую {list}-маску, а 26.7 и новее — последнюю. Пиру на 26.7 и новее нужен этот список в обратном порядке.',
    'Xray {tag} applies the last {list} mask nearest the socket; 26.3 applied the first one there. A peer on 26.3 needs this list in reverse order.':
        'Xray {tag} ставит ближе всего к сокету последнюю {list}-маску, а 26.3 ставил первую. Пиру на 26.3 нужен этот список в обратном порядке.',
    '{type} has to be the first UDP mask on Xray {tag}. Anywhere else the core stops with "requires being at the outermost level" when it sets the connection up.':
        'На Xray {tag} {type} должна быть первой UDP-маской. В любом другом месте ядро при установке соединения остановится с «requires being at the outermost level».',
    '{type} has to be the last UDP mask on Xray {tag}. Anywhere else the core stops with "requires being at the outermost level" when it sets the connection up.':
        'На Xray {tag} {type} должна быть последней UDP-маской. В любом другом месте ядро при установке соединения остановится с «requires being at the outermost level».',
    'A UDP sudoku mask has to be the first in the list on Xray {tag}. Anywhere else the core stops with "must be the innermost mask in chain".':
        'На Xray {tag} UDP-маска sudoku должна стоять в списке первой. В любом другом месте ядро остановится с «must be the innermost mask in chain».',
    'A UDP sudoku mask has to be the last in the list on Xray {tag}. Anywhere else the core stops with "must be the innermost mask in chain".':
        'На Xray {tag} UDP-маска sudoku должна стоять в списке последней. В любом другом месте ядро остановится с «must be the innermost mask in chain».',
    '{type} cannot run over quicParams.udpHop on Xray {tag}: with hop ports set, every dial fails with "requires being at the outermost level".':
        'На Xray {tag} {type} не работает поверх quicParams.udpHop: когда заданы порты для прыжков, каждое подключение падает с «requires being at the outermost level».',
    'xdns needs a domain on Xray {tag}; without one the config does not load ("empty domain").':
        'На Xray {tag} xdns нужен domain; без него конфиг не загрузится («empty domain»).',
    'xdns needs domains (server) or resolvers (client) on Xray {tag}; with neither the config does not load.':
        'На Xray {tag} xdns нужны domains (сервер) или resolvers (клиент); без обоих конфиг не загрузится.',
    'Resolver "{value}" has no "+udp://" part, so Xray {tag} refuses the config. The form is domain+udp://IP:port.':
        'В резолвере «{value}» нет части «+udp://», поэтому Xray {tag} отвергает конфиг. Формат: domain+udp://IP:port.',
    'An xdns server answers for its domains, and this one has none: the inbound fails to start ("empty domains").':
        'Сервер xdns отвечает за свои domains, а здесь их нет: inbound не запустится («empty domains»).',
    'An xdns client sends through its resolvers, and this one has none: every connection fails ("empty resolvers").':
        'Клиент xdns шлёт запросы через свои resolvers, а здесь их нет: каждое подключение упадёт («empty resolvers»).',
    'udphop only works on the client side; on an inbound Xray {tag} fails to start ("udphop: client only").':
        'udphop работает только на стороне клиента; с ним на inbound Xray {tag} не стартует («udphop: client only»).',
    'udphop needs a mode on Xray {tag}: intervalLocal, intervalRemote or perConnRemote, comma-separated. Without one the config does not load.':
        'На Xray {tag} udphop нужен mode: intervalLocal, intervalRemote или perConnRemote через запятую. Без него конфиг не загрузится.',
    '"{value}" is not a udphop mode, so Xray {tag} refuses the config. It takes intervalLocal, intervalRemote and perConnRemote, comma-separated without spaces.':
        '«{value}» — не режим udphop, поэтому Xray {tag} отвергает конфиг. Принимаются intervalLocal, intervalRemote и perConnRemote через запятую без пробелов.',
    'udphop needs an interval of at least 5 seconds at both ends (10, or "5-30"); otherwise every connection fails ("invalid interval").':
        'udphop нужен interval не меньше 5 секунд с обоих концов (10 или «5-30»); иначе каждое подключение упадёт («invalid interval»).',

    "Each user signs in with its auth string. Bandwidth is not set here: it belongs to the transport's finalmask (quicParams brutalUp / brutalDown).":
        'Каждый пользователь входит по своей строке auth. Скорость здесь не задаётся: она живёт в finalmask транспорта (quicParams brutalUp / brutalDown).',
    'Auth':
        'Auth (пароль)',
    'A plain entry matches every domain that contains it; full: matches one exact domain, and domain:, keyword:, regexp: and geosite: work as in routing rules. A bad regexp or an unknown geosite stops the config from loading. 26.3 read a plain entry as an exact domain.':
        'Запись без префикса совпадает с любым доменом, который её содержит; full: — ровно с одним доменом, а domain:, keyword:, regexp: и geosite: работают как в правилах маршрутизации. Кривой regexp или неизвестный geosite не дадут конфигу загрузиться. 26.3 читал запись без префикса как точный домен.',
    'A plain entry matches that exact domain, and regexp: is understood. From 26.7 a plain entry matches as a substring instead — regexp:^name$ stays exact on every version.':
        'Запись без префикса совпадает ровно с этим доменом, ещё понимается regexp:. С 26.7 такая запись совпадает как подстрока — точным на всех версиях остаётся только regexp:^name$.',
    '"auto" picks the interface outbound traffic leaves by, a name pins one, and an empty value turns it off. With routing-table entries set and this left out, the core uses "auto".':
        '"auto" сам выбирает интерфейс, через который уходит исходящий трафик, имя закрепляет конкретный, пустое значение выключает. Если записи таблицы маршрутизации заданы, а это поле пропущено, ядро берёт "auto".',
    'Forwarding Target':
        'Куда перенаправлять',
    'Where every connection arriving here is sent. Left empty, the original destination is kept — which is what transparent proxying with Follow Redirect needs.':
        'Куда отправляется каждое пришедшее сюда соединение. Если пусто, остаётся исходное назначение — это и нужно прозрачному проксированию с Follow Redirect.',
    'Left empty, the original port is kept.':
        'Если пусто, остаётся исходный порт.',
    'Which traffic this inbound accepts. Left out, only TCP.':
        'Какой трафик принимает этот inbound. Если не указано — только TCP.',
    'Follow Redirect':
        'Follow Redirect',
    'Send redirected (TPROXY / REDIRECT) traffic to its original destination instead of the address above.':
        'Отправлять перенаправленный (TPROXY / REDIRECT) трафик по его исходному назначению, а не на адрес выше.',
    '{key} and {alias} are both set. Every supported Xray reads {key}, so {alias} does nothing.':
        'Заданы и {key}, и {alias}. Все поддерживаемые версии Xray читают {key}, так что {alias} ничего не делает.',
    '{key} is empty, which leaves this inbound with no users on any supported Xray.':
        '{key} пуст — значит, на любой поддерживаемой версии Xray у этого inbound нет пользователей.',
    'Use {alias} instead':
        'Взять {alias}',
    'Remove {alias}':
        'Убрать {alias}',
    '{what} is not read by any supported Xray version — it does nothing.':
        '{what} не читает ни одна поддерживаемая версия Xray — оно ничего не делает.',
    'Rename to {key}':
        'Переименовать в {key}',
    'Remove the reverse section':
        'Убрать секцию reverse',
    'Legacy reverse is refused by Xray {tag}':
        'Старый reverse отвергается Xray {tag}',
    "Bridges and portals were removed in 26.7. Any reverse section — even an empty one — stops the config from loading, and the core's error points at VLESS reverse proxy.":
        'Мосты и порталы удалены в 26.7. Любая секция reverse — даже пустая — не даёт конфигу загрузиться, а ошибка ядра отсылает к VLESS reverse proxy.',
    'VLESS reverse proxy replaces it: the server gives a VLESS client a reverse tag, and the far end dials in with a VLESS outbound carrying settings.reverse. This editor does not build that yet.':
        "На смену пришёл VLESS reverse proxy: сервер даёт VLESS-клиенту тег reverse, а другая сторона подключается VLESS outbound'ом с settings.reverse. Этот редактор пока такое не собирает.",
    'What this config has':
        'Что есть в этом конфиге',
    'Removing the section is what lets this config load on {tag}. To keep editing it instead, set the target Xray version to 26.3 in Settings.':
        'Только без этой секции конфиг загрузится на {tag}. Чтобы продолжить её редактировать, выберите в настройках целевую версию Xray 26.3.',
    'This config has no reverse section, and nothing here will add one.':
        'Секции reverse в этом конфиге нет, и отсюда её не добавить.',
    'Works on 26.3 only. From 26.7 any reverse section stops the config from loading — VLESS reverse proxy replaces it.':
        'Работает только на 26.3. С 26.7 любая секция reverse не даёт конфигу загрузиться — её заменяет VLESS reverse proxy.',

    'This transport was removed from Xray, so there is nothing here to edit. Pick another network above.':
        'Этот транспорт удалён из Xray, редактировать здесь нечего. Выберите другую сеть выше.',
    'mKCP obfuscation is a Finalmask UDP mask now. On Xray {tag}: {masks}. Add one under Finalmask below.':
        'Обфускация mKCP теперь делается UDP-маской Finalmask. В Xray {tag}: {masks}. Добавьте её в Finalmask ниже.',
    'Max Sending Window (bytes)':
        'Макс. окно отправки (байт)',
    'Replaced writeBufferSize in Xray 26.7. Must be at least the MTU.':
        'Заменило writeBufferSize в Xray 26.7. Должно быть не меньше MTU.',
    'Congestion Window Multiplier':
        'Множитель окна перегрузки',
    '404 Not Found (default)':
        '404 Not Found (по умолчанию)',
    'Files from a directory':
        'Файлы из каталога',
    'Reverse proxy':
        'Обратный прокси',
    'Fixed response':
        'Фиксированный ответ',
    'Hysteria Settings':
        'Настройки Hysteria',
    'hysteriaSettings.version must be 2 — Xray {tag} refuses anything else, including no version at all.':
        'hysteriaSettings.version должен быть 2 — любое другое значение, как и его отсутствие, Xray {tag} отвергает.',
    'Set version 2':
        'Указать версию 2',
    'Checked only when this inbound has no users of its own.':
        'Проверяется, только если у этого inbound нет своих пользователей.',
    'The password this client sends to the server.':
        'Пароль, который клиент отправляет серверу.',
    'UDP Idle Timeout (s)':
        'Таймаут простоя UDP (с)',
    'Masquerade':
        'Маскировка',
    'What the server shows to anything that is not a Hysteria client.':
        'Что сервер показывает всем, кто не является клиентом Hysteria.',
    'Xray {tag} does not know this masquerade — the inbound will not start.':
        'Xray {tag} не знает такую маскировку — inbound не запустится.',
    'Directory':
        'Каталог',
    'Upstream URL':
        'URL апстрима',
    'Rewrite Host header':
        'Переписывать заголовок Host',
    'Skip upstream certificate check':
        'Не проверять сертификат апстрима',
    'Add X-Forwarded-* headers':
        'Добавлять заголовки X-Forwarded-*',
    'Response Body':
        'Тело ответа',
    'Status Code':
        'Код ответа',
    'Protocol version 2 is written for you — it is the only one Xray takes. Congestion control, bandwidth and port hopping are set under Finalmask.':
        'Версия протокола 2 записывается автоматически — другую Xray не принимает. Контроль перегрузки, полоса и смена портов настраиваются в Finalmask.',
    'ECH Force Query':
        'Принудительный запрос ECH',
    'How hard to insist on fetching the ECH config over DNS: none, half or full. Only Xray 26.3 reads it.':
        'Насколько настойчиво запрашивать конфиг ECH через DNS: none, half или full. Читает только Xray 26.3.',
    'This config also sets method = "{method}", the alias of network that Xray {tag} reads first — so {method} is the transport that runs, whatever network says.':
        'В конфиге ещё задан method = "{method}" — синоним network, который Xray {tag} читает первым. Поэтому работает транспорт {method}, что бы ни было в network.',
    'Move it to network':
        'Перенести в network',
    '{keys} belong to another transport. Xray builds them anyway, so one that no longer loads stops the whole config.':
        '{keys} относятся к другому транспорту. Xray всё равно их собирает, так что если один из них не загружается, не загрузится и весь конфиг.',
    'Remove them':
        'Удалить их',
    'It turned off certificate checks. Pin the server certificate by its SHA-256, or name the certificate you expect, instead.':
        'Он отключал проверку сертификата. Вместо этого закрепите сертификат сервера по SHA-256 или укажите, какой сертификат ожидается.',
    'A hysteria proxy runs only on the hysteria transport — Xray {tag} refuses to start it on anything else.':
        'Прокси hysteria работает только на транспорте hysteria — на любом другом Xray {tag} его не запустит.',
    'The hysteria transport runs only with TLS: without it an inbound does not start and an outbound cannot connect.':
        'Транспорт hysteria работает только с TLS: без него inbound не запустится, а outbound не сможет подключиться.',
    'REALITY runs only over RAW, XHTTP or gRPC — Xray {tag} refuses it over {network}.':
        'REALITY работает только поверх RAW, XHTTP или gRPC — поверх {network} Xray {tag} его отвергает.',
    'Xray {tag} takes {min}–{max} ms.':
        'Xray {tag} принимает {min}–{max} мс.',
    'Xray {tag} refuses an MTU below {min}.':
        'Xray {tag} отвергает MTU меньше {min}.',
    'Xray {tag} refuses a value below {min}.':
        'Xray {tag} отвергает значение меньше {min}.',
    'Xray {tag} refuses a window smaller than the MTU ({mtu} bytes).':
        'Xray {tag} отвергает окно меньше MTU ({mtu} байт).',
    'Xray {tag} takes 0 (default {fallback}) or {min}–{max} s.':
        'Xray {tag} принимает 0 (по умолчанию {fallback}) или {min}–{max} с.',
    'Xray {tag} refuses addressPortStrategy on a freedom outbound — the config will not load.':
        'Xray {tag} отвергает addressPortStrategy на outbound freedom — конфиг не загрузится.',
    'Xray {tag} does not know this strategy — the config will not load.':
        'Xray {tag} не знает такой стратегии — конфиг не загрузится.',
    'On a freedom outbound Xray {tag} replaces this with a non-AsIs targetStrategy or settings.domainStrategy, and logs that it did.':
        'На outbound freedom Xray {tag} заменяет это значение на targetStrategy или settings.domainStrategy, если там не AsIs, и пишет об этом в лог.',
    'Look the destination up in DNS SRV or TXT records and dial the address and/or port found there.':
        'Искать адрес назначения в DNS-записях SRV или TXT и подключаться к найденным там адресу и/или порту.',
    'Left empty, Xray {tag} uses {pool}, 600-900 requests and 1800-3000 s per connection. Set it to get the same on every core.':
        'Если оставить пустым, Xray {tag} использует {pool}, 600-900 запросов и 1800-3000 с на соединение. Задайте явно, чтобы на всех ядрах было одинаково.',
    'Xray {tag} refuses downloadSettings in mode stream-one — pick another mode or remove them.':
        'Xray {tag} отвергает downloadSettings в режиме stream-one — выберите другой режим или удалите их.',

    'hysteriaSettings needs version 2; Xray {tag} refuses anything else.':
        'hysteriaSettings нужна version 2; всё остальное Xray {tag} отвергает.',

    'Whether a domain is resolved so IP rules can match it. Which address family it resolves to is DNS Query Strategy.':
        'Резолвить ли домен, чтобы по нему сработали IP-правила. В какой адрес — IPv4 или IPv6 — решает Query Strategy в DNS.',
    'Not a routing strategy — the core treats it as AsIs':
        'Это не стратегия маршрутизации — ядро считает её AsIs',
    'This rule sets domainStrategy "{value}", which no supported Xray core reads on a rule. For IP rules to match a domain, set Domain Strategy to IPIfNonMatch or IPOnDemand at the top of Routing; to resolve IPv4 only, set Query Strategy to UseIPv4 in DNS.':
        'У правила задан domainStrategy «{value}», а у правила его не читает ни одно поддерживаемое ядро Xray. Чтобы IP-правила срабатывали по домену, поставьте Domain Strategy = IPIfNonMatch или IPOnDemand вверху окна маршрутизации; чтобы резолвить только в IPv4 — Query Strategy = UseIPv4 в DNS.',

    'Noise presets':
        'Пресеты шума',
    "The noise the WARP profiles send ahead of WireGuard's handshake. Pressing one replaces the packets of this chain's noise layer, or adds a noise layer next to the socket if there is none. Made for WireGuard; any UDP transport takes it.":
        'Шум, который WARP-профили отправляют перед рукопожатием WireGuard. Кнопка заменяет пакеты в noise-слое этой цепочки, а если его нет — добавляет noise-слой у сокета. Сделано под WireGuard, но подходит любому UDP-транспорту.',
    'A SIP call opening (INVITE, then 100 Trying), then four random 40-70 byte packets — the noise WARP Profile C sends.':
        'Начало SIP-звонка (INVITE, затем 100 Trying), затем четыре случайных пакета по 40–70 байт — шум из WARP Profile C.',

    'WARP did not register — {tag} was added without keys':
        'WARP не зарегистрировался — {tag} добавлен без ключей',
    'Open the outbound and press Generate WARP to register it. Reason: {reason}':
        'Откройте outbound и нажмите «Сгенерировать WARP», чтобы его зарегистрировать. Причина: {reason}',
    'Network error or proxy timeout.':
        'Ошибка сети или таймаут прокси.',

    "The call this datagram claims to be part of. Every one of these ends up in the plain text a middlebox reads, so they are what make the packet look like somebody's softphone rather than ours.":
        'Звонок, частью которого притворяется эта датаграмма. Все эти поля попадают в открытый текст, который читает промежуточное оборудование, — именно они делают пакет похожим на чей-то софтфон, а не на наш.',
    'Who is calling whom':
        'Кто кому звонит',
    'A new call — what a softphone opens with.':
        'Новый звонок — с этого начинает софтфон.',
    "A proxy's provisional answer to an INVITE.":
        'Предварительный ответ прокси на INVITE.',
    "The callee's phone is alerting.":
        'Телефон вызываемого звонит.',
    'A client binding its address with a registrar.':
        'Клиент регистрирует свой адрес на сервере.',
    'The capability probe proxies trade as a keep-alive.':
        'Запрос возможностей, которым прокси обмениваются для поддержания связи.',
    'A request (INVITE, REGISTER, OPTIONS) carries Max-Forwards and a Contact; 100 and 180 are responses to an INVITE and carry neither.':
        'Запрос (INVITE, REGISTER, OPTIONS) несёт Max-Forwards и Contact; 100 и 180 — ответы на INVITE, и в них нет ни того, ни другого.',
    'Caller':
        'Кто звонит',
    "Caller's host":
        'Хост звонящего',
    'Callee':
        'Кому звонят',
    "Callee's host":
        'Хост вызываемого',
    'Via host':
        'Хост в Via',
    "The Via sent-by: the endpoint this datagram claims to come from, inside the caller's own domain.":
        'Поле sent-by в Via: узел, от имени которого отправлена датаграмма, внутри домена звонящего.',
    'Call identifiers':
        'Идентификаторы звонка',
    'Drawn fresh for every call. Edit them to pin this packet down exactly.':
        'Генерируются заново для каждого звонка. Измените, если нужно зафиксировать пакет точно.',
    'Via branch':
        'Branch в Via',
    'The transaction id. RFC 3261 s8.1.1.7 requires the magic cookie z9hG4bK in front of it — without it a receiver reads the whole packet under the older RFC 2543 rules.':
        'Идентификатор транзакции. RFC 3261 п.8.1.1.7 требует префикс-метку z9hG4bK — без неё получатель разбирает весь пакет по старым правилам RFC 2543.',
    'From tag':
        'Тег в From',
    'RFC 3261 s19.3 asks for at least 32 bits of randomness here.':
        'RFC 3261 п.19.3 требует здесь не менее 32 бит случайности.',
    'CSeq':
        'CSeq',
    'The sequence number of this request. Real stacks start anywhere below 2^31, so a large number is as plausible as a small one.':
        'Порядковый номер запроса. Настоящие стеки начинают с любого числа меньше 2^31, так что большое значение выглядит не менее правдоподобно, чем маленькое.',
    'Call-ID':
        'Call-ID',
    'RFC 3261 s8.1.1.4: a cryptographically random local id, then @ and the host it was made on.':
        'RFC 3261 п.8.1.1.4: криптослучайный локальный идентификатор, затем @ и хост, на котором он создан.',
    'ALPN':
        'ALPN',
    'Comma-separated protocol ids. QUIC makes ALPN mandatory (RFC 9001 s8.1); h3 is what a browser sends.':
        'Идентификаторы протоколов через запятую. В QUIC поле ALPN обязательно (RFC 9001 п.8.1); браузер отправляет h3.',
    'Datagram size':
        'Размер датаграммы',
    'The whole datagram, padding included: RFC 9000 s14.1 requires a client Initial of at least {n} bytes. The ClientHello is a few hundred — everything past it is PADDING frames, exactly as a real client sends them.':
        'Вся датаграмма вместе с набивкой: RFC 9000 п.14.1 требует для клиентского Initial не менее {n} байт. ClientHello занимает несколько сотен, всё остальное — кадры PADDING, ровно как у настоящего клиента.',
    'Destination connection ID':
        'Идентификатор соединения получателя',
    "Hex, 8 bytes in a real client's first packet. The initial keys are derived from it, which is why anyone can decrypt this datagram — it buys camouflage, never privacy.":
        'Шестнадцатеричное, 8 байт в первом пакете настоящего клиента. Из него выводятся начальные ключи, поэтому расшифровать эту датаграмму может кто угодно: она даёт маскировку, но не приватность.',
    'Source connection ID':
        'Идентификатор соединения отправителя',
    'Hex. May be empty — plenty of clients send no source id at all.':
        'Шестнадцатеричное. Может быть пустым — многие клиенты вообще не отправляют свой идентификатор.',
    'The question this query asks. It is never resolved — the datagram goes to the peer, not to a resolver — so it only has to read like a name.':
        'Имя, о котором спрашивает запрос. Он никогда не будет разрешён — датаграмма идёт пиру, а не резолверу, — поэтому достаточно, чтобы оно выглядело как имя.',
    'Record type':
        'Тип записи',
    'An IPv4 address: the commonest query there is.':
        'Адрес IPv4 — самый частый запрос.',
    'An IPv6 address.':
        'Адрес IPv6.',
    'What a browser asks for before it connects (RFC 9460).':
        'То, что браузер запрашивает перед подключением (RFC 9460).',
    'Free text — the least ordinary of the four on a fresh flow.':
        'Произвольный текст — наименее обычный из четырёх в начале соединения.',
    'Recursion desired':
        'Нужна рекурсия',
    'The RD flag of the header. A stub resolver asking a recursive server always sets it, so leaving it off is the unusual choice.':
        'Флаг RD в заголовке. Клиентский резолвер, обращаясь к рекурсивному серверу, всегда его ставит, так что снятый флаг выглядит необычно.',
    'SOFTWARE':
        'SOFTWARE',
    'Names the ICE agent, the way a real one does. Leave it empty and the attribute is left out entirely — a bare 20-byte header, which is still a complete Binding request and the commonest shape on the wire.':
        'Называет ICE-агента так же, как это делает настоящий. Оставьте пустым — и атрибут не будет добавлен вовсе: голый 20-байтный заголовок, который остаётся полноценным запросом Binding и встречается в сети чаще всего.',
    'Tag chain':
        'Цепочка тегов',
    'An AmneziaWG I1..I5 line. <b hex> writes those bytes, <r n> n random ones, <rc n> and <rd n> n random letters or digits, <t> a four-byte timestamp. <d>, <ds> and <dz n> splice in the real WireGuard payload, which a standalone decoy has none of.':
        'Строка I1..I5 из AmneziaWG. <b hex> пишет эти байты, <r n> — n случайных, <rc n> и <rd n> — n случайных букв или цифр, <t> — четырёхбайтную метку времени. Теги <d>, <ds> и <dz n> подставляют настоящую полезную нагрузку WireGuard, которой у отдельной обманки нет.',
    'No tags yet — a chain is written as <b 0x…><r 16>, and anything outside the brackets is ignored.':
        'Тегов пока нет. Цепочка записывается как <b 0x…><r 16>; всё за пределами скобок игнорируется.',
    'Bytes':
        'Байты',
    'Not hex — expected pairs of 0-9 and a-f.':
        'Не шестнадцатеричное значение — ожидаются пары из 0-9 и a-f.',
    '{n} bytes. Whitespace and a leading 0x are ignored, so pasting a dump works.':
        '{n} байт. Пробелы и ведущий 0x игнорируются, так что можно вставить дамп как есть.',
    "The same decoys as AmneziaWG writes them. These lines go in the [Interface] section of a .conf, beside the keys. The rest of the profile — addresses, peer, MTU — comes from the outbound itself; export the whole thing from the outbound's menu.":
        'Те же обманки в записи AmneziaWG. Эти строки идут в секцию [Interface] файла .conf, рядом с ключами. Остальная часть профиля — адреса, пир, MTU — берётся из самого outbound; целиком его можно выгрузить кнопкой в редакторе outbound.',
    "Bytes per datagram, as a range. The upper bound is exclusive, so 40-70 sends 40 to 69 bytes — the same as AmneziaWG's Jmin/Jmax.":
        'Байт на датаграмму, диапазоном. Верхняя граница не включается: 40-70 отправляет от 40 до 69 байт — так же, как Jmin/Jmax в AmneziaWG.',
    'Byte values':
        'Значения байт',
    'Which byte values the random bytes are drawn from, both ends included. Empty means the whole range, 0-255. AmneziaWG has no equivalent, so a narrowed range is dropped on export.':
        'Из каких значений берутся случайные байты, включая обе границы. Пусто — весь диапазон 0-255. В AmneziaWG такого нет, поэтому при выгрузке суженный диапазон теряется.',
    'Noise Generator':
        'Генератор шума',
    'Redraw all':
        'Перегенерировать всё',
    'Decoys':
        'Обманки',
    'Settings':
        'Настройки',
    'AmneziaWG':
        'AmneziaWG',
    'Redraw':
        'Перегенерировать',
    'Pick a decoy on the left, or add one.':
        'Выберите обманку слева или добавьте новую.',
    'Delay after':
        'Пауза после',
    'Milliseconds to wait before the next datagram, as a range. Empty sends them back to back, which is what AmneziaWG does.':
        'Сколько миллисекунд ждать перед следующей датаграммой, диапазоном. Пусто — отправлять подряд, как делает AmneziaWG.',
    'What goes on the wire':
        'Что уйдёт в сеть',
    'largest {n} B':
        'самая большая {n} Б',
    'Seconds of silence to a destination after which the decoys are sent again. Empty sends them once per destination; AmneziaWG instead sends them before every handshake, so a value near the key rotation time is the closest match.':
        'Сколько секунд тишины до адреса, после которых обманки отправляются снова. Пусто — один раз на адрес; AmneziaWG же шлёт их перед каждым рукопожатием, поэтому ближе всего значение около времени смены ключей.',
    '{n} datagram|{n} datagrams':
        '{n} датаграмма|{n} датаграммы|{n} датаграмм',
    'SIP call':
        'Звонок SIP',
    'QUIC Initial':
        'QUIC Initial',
    'DNS query':
        'Запрос DNS',
    'STUN binding':
        'Binding STUN',
    'AmneziaWG chain':
        'Цепочка AmneziaWG',
    'Raw bytes':
        'Произвольные байты',
    'no SOFTWARE attribute':
        'без атрибута SOFTWARE',
    'empty chain':
        'пустая цепочка',
    'Random junk':
        'Случайный мусор',
    '{n} B':
        '{n} Б',
    '×{count}, {size} B':
        '×{count}, {size} Б',
    'No decoys yet. Add one below.':
        'Обманок пока нет. Добавьте ниже.',
    'Add a decoy':
        'Добавить обманку',
    'AmneziaWG profile copied':
        'Профиль AmneziaWG скопирован',
    'Paste it into a .conf file.':
        'Вставьте его в файл .conf.',
    'Export .conf':
        'Выгрузить .conf',
    'Nothing to send yet.':
        'Отправлять пока нечего.',
    '… {n} more bytes':
        '… ещё {n} байт',
    'A QUIC Initial for www.cloudflare.com, then four random 40-70 byte packets. The shape WARP Profile A sends.':
        'QUIC Initial для www.cloudflare.com, затем четыре случайных пакета по 40–70 байт. Та же форма, что шлёт WARP Profile A.',
    'A QUIC Initial for www.google.com, then four random 40-70 byte packets. The shape WARP Profile B sends.':
        'QUIC Initial для www.google.com, затем четыре случайных пакета по 40–70 байт. Та же форма, что шлёт WARP Profile B.',
    'Generate…':
        'Сгенерировать…',

    'Not hex — the packet keeps the last id that was.':
        'Не шестнадцатеричное значение — пакет сохраняет последний корректный идентификатор.',
    'Server name (SNI)':
        'Имя сервера (SNI)',
    'The name that travels in the clear inside the ClientHello — the one field anyone on the path actually reads. Pick a host an ordinary browser would be opening.':
        'Имя, которое передаётся открытым текстом внутри ClientHello: единственное поле, которое реально читает любой на пути. Выберите хост, который открывал бы обычный браузер.',
    'A whole number, at least {n} — until then the packet keeps its last valid size.':
        'Целое число не меньше {n}; до этого пакет сохраняет последний корректный размер.',
    'This packet could not be built, so it still holds the last version that worked: {reason}':
        'Пакет не удалось собрать, поэтому он сохраняет последнюю удачную версию: {reason}',

    'larger than a 1280-byte path allows':
        'больше, чем пропустит путь с MTU 1280',
    '"{arg}" is not a number':
        '«{arg}» — не число',
    'negative length {length}':
        'отрицательная длина {length}',
    'length {length} exceeds one datagram':
        'длина {length} не помещается в одну датаграмму',
    'empty argument':
        'пустой аргумент',
    'odd amount of symbols':
        'нечётное количество символов',
    '"{arg}" is not hex':
        '«{arg}» — не шестнадцатеричное значение',
    'missing enclosing > — the chain is cut off':
        'нет закрывающей > — цепочка обрывается',
    'empty tag <>':
        'пустой тег <>',
    'unknown tag <{key}>':
        'неизвестный тег <{key}>',
    'failed to build <{key}>: {error}':
        'не удалось собрать <{key}>: {error}',
    '<{key}> has no usable length ({error}) and contributes nothing':
        'у <{key}> нет пригодной длины ({error}), и он ничего не добавляет',
    '<b> is not usable hex ({error}) and contributes nothing':
        '<b> содержит непригодное шестнадцатеричное значение ({error}) и ничего не добавляет',
    '<t> is the current unix time, read anew on every AWG handshake; this config freezes it at its first draw':
        '<t> — текущее время unix, которое AWG берёт заново перед каждым рукопожатием; здесь оно фиксируется на первом значении',
    '<r> is random bytes, drawn anew on every AWG handshake; this config freezes it at its first draw':
        '<r> — случайные байты, которые AWG берёт заново перед каждым рукопожатием; здесь они фиксируются на первом значении',
    '<rc> is random latin letters, drawn anew on every AWG handshake; this config freezes it at its first draw':
        '<rc> — случайные латинские буквы, которые AWG берёт заново перед каждым рукопожатием; здесь они фиксируются на первом значении',
    '<rd> is random digits, drawn anew on every AWG handshake; this config freezes it at its first draw':
        '<rd> — случайные цифры, которые AWG берёт заново перед каждым рукопожатием; здесь они фиксируются на первом значении',
    '<d> stands for the real WireGuard payload, which a standalone noise packet has none of — it contributes nothing here':
        '<d> подставляет настоящую нагрузку WireGuard, которой у отдельного noise-пакета нет, — здесь он ничего не добавляет',
    '<ds> stands for the real WireGuard payload, which a standalone noise packet has none of — its base64 is empty here':
        '<ds> подставляет настоящую нагрузку WireGuard, которой у отдельного noise-пакета нет, — здесь его base64 пуст',
    '<dz> stands for the real WireGuard payload, which a standalone noise packet has none of — it becomes that many zero bytes':
        '<dz> подставляет длину настоящей нагрузки WireGuard, которой у отдельного noise-пакета нет, — здесь он превращается в столько же нулевых байт',
    'The finalmask noise layer has no noise list, so the exported .conf carries no decoys.':
        'В noise-слое finalmask нет списка пакетов, поэтому в выгруженном .conf нет обманок.',
    "The outbound's reserved ({bytes}) was dropped: it substitutes three bytes of WireGuard's header for Cloudflare WARP, and AWG has no equivalent. It is not the same thing as S1/S2, which pad handshake messages, so it was not written as those.":
        'Поле reserved ({bytes}) не перенесено: оно подменяет три байта заголовка WireGuard для Cloudflare WARP, а в AWG такого нет. Это не то же самое, что S1/S2, которые добавляют паддинг к handshake-сообщениям, поэтому записывать его туда нельзя.',
    'Peer {index} has no publicKey and no endpoint, so the client app has nothing to connect to.':
        'У пира {index} нет ни publicKey, ни endpoint, поэтому клиенту некуда подключаться.',
    'Peer {index} has no {field}, so the client app has nothing to connect to.':
        'У пира {index} нет поля {field}, поэтому клиенту некуда подключаться.',
    'This outbound is "{protocol}", not wireguard. Only the fields a WireGuard client reads were exported.':
        'Этот outbound имеет протокол «{protocol}», а не wireguard. Выгружены только поля, которые читает клиент WireGuard.',
    'The outbound has no secretKey, so the .conf has no PrivateKey and no client app will load it.':
        'У outbound нет secretKey, поэтому в .conf нет строки PrivateKey и ни один клиент его не загрузит.',
    'The outbound has no address, so the .conf has no Address line and the interface cannot come up.':
        'У outbound нет адреса, поэтому в .conf нет строки Address и интерфейс не поднимется.',
    'The outbound has no peers, so the .conf has no [Peer] section.':
        'У outbound нет пиров, поэтому в .conf нет секции [Peer].',
    'The outbound could not be exported: {error}':
        'Не удалось выгрузить outbound: {error}',
    '{n} noise item sets both packet and rand, which no supported core loads (v26.7.28:infra/conf/transport_finalmask.go:387). Exported as fixed bytes.|{n} noise items set both packet and rand, which no supported core loads (v26.7.28:infra/conf/transport_finalmask.go:387). Exported as fixed bytes.':
        '{n} noise-пакет задаёт сразу packet и rand, чего не принимает ни одно поддерживаемое ядро (v26.7.28:infra/conf/transport_finalmask.go:387). Выгружен как фиксированные байты.|{n} noise-пакета задают сразу packet и rand, чего не принимает ни одно поддерживаемое ядро (v26.7.28:infra/conf/transport_finalmask.go:387). Выгружены как фиксированные байты.|{n} noise-пакетов задают сразу packet и rand, чего не принимает ни одно поддерживаемое ядро (v26.7.28:infra/conf/transport_finalmask.go:387). Выгружены как фиксированные байты.',
    '{n} noise item has neither packet nor rand and were left out.|{n} noise items have neither packet nor rand and were left out.':
        '{n} noise-пакет не содержит ни packet, ни rand и пропущен.|{n} noise-пакета не содержат ни packet, ни rand и пропущены.|{n} noise-пакетов не содержат ни packet, ни rand и пропущены.',
    '{n} noise packet decoded to no bytes and were left out: AWG has no way to send an empty decoy.|{n} noise packets decoded to no bytes and were left out: AWG has no way to send an empty decoy.':
        '{n} noise-пакет раскодировался в ноль байт и пропущен: AWG не умеет отправлять пустую обманку.|{n} noise-пакета раскодировались в ноль байт и пропущены: AWG не умеет отправлять пустую обманку.|{n} noise-пакетов раскодировались в ноль байт и пропущены: AWG не умеет отправлять пустую обманку.',
    '{n} random noise item has a size that could not be read (expected "40-70" or a number) and were left out of Jc.|{n} random noise items have a size that could not be read (expected "40-70" or a number) and were left out of Jc.':
        'У {n} случайного noise-пакета не удалось прочитать размер (ожидается «40-70» или число), он не вошёл в Jc.|У {n} случайных noise-пакетов не удалось прочитать размер (ожидается «40-70» или число), они не вошли в Jc.|У {n} случайных noise-пакетов не удалось прочитать размер (ожидается «40-70» или число), они не вошли в Jc.',
    '{what} is not hex.':
        '{what} — не шестнадцатеричное значение.',
    '{what} is {size} bytes; QUIC v1 allows at most {max} (RFC 9000 s17.2).':
        '{what} занимает {size} байт, а QUIC v1 допускает не больше {max} (RFC 9000 п.17.2).',
    'Destination Connection ID':
        'Идентификатор соединения получателя',
    'Source Connection ID':
        'Идентификатор соединения отправителя',
    "Destination Connection ID is {size} bytes; a client's first one must be at least {min} so the server gets enough entropy (RFC 9000 s7.2).":
        'Идентификатор соединения получателя занимает {size} байт, а в первом пакете клиента их должно быть не меньше {min}, чтобы сервер получил достаточно энтропии (RFC 9000 п.7.2).',
    'Size must be a whole number of bytes.':
        'Размер должен быть целым числом байт.',
    'Size is {size}; a client Initial datagram must be padded to at least {min} bytes or a server will drop it (RFC 9000 s14.1).':
        'Размер {size}, а клиентскую датаграмму Initial нужно дополнить минимум до {min} байт, иначе сервер её отбросит (RFC 9000 п.14.1).',
    'Size is {size}; a UDP payload cannot exceed {max} bytes.':
        'Размер {size}, а полезная нагрузка UDP не может превышать {max} байт.',
    'Server name is empty; the SNI extension needs a host name to carry.':
        'Имя сервера пустое, а расширению SNI нужно имя хоста.',
    '"{name}" is not a host name, so the SNI will not look like a browser\'s.':
        '«{name}» — не имя хоста, поэтому SNI не будет похож на браузерный.',
    'No ALPN ids; QUIC requires ALPN, and a server closes the connection without it (RFC 9001 s8.1).':
        'Не задан ни один идентификатор ALPN. В QUIC поле ALPN обязательно, без него сервер закроет соединение (RFC 9001 п.8.1).',
    'An ALPN id is empty; each one is a non-empty byte string (RFC 7301 s3.1).':
        'Один из идентификаторов ALPN пуст, а каждый должен быть непустой строкой байт (RFC 7301 п.3.1).',
    'ALPN id "{id}" is longer than the 255 bytes its length prefix allows.':
        'Идентификатор ALPN «{id}» длиннее 255 байт, которые допускает его префикс длины.',
    'A {size}-byte datagram leaves {room} bytes for frames, but this ClientHello needs {needed}. Raise the size or shorten the server name.':
        'В датаграмме размером {size} байт под кадры остаётся {room} байт, а этому ClientHello нужно {needed}. Увеличьте размер или сократите имя сервера.',
    'handshake initiation':
        'начало рукопожатия',
    'handshake response':
        'ответ рукопожатия',
    'cookie reply':
        'ответ cookie',
    'transport packets':
        'транспортные пакеты',
    'This profile pads WireGuard\'s own messages — {targets}. Xray\'s WireGuard sends them unpadded, and the setting is dropped. It is not the same thing as the outbound\'s "reserved", which substitutes three header bytes for Cloudflare WARP; writing it there would corrupt the handshake.':
        'Профиль добавляет паддинг к собственным сообщениям WireGuard: {targets}. WireGuard в Xray отправляет их без паддинга, поэтому настройка не перенесена. Это не то же самое, что поле «reserved» у outbound, которое подменяет три байта заголовка для Cloudflare WARP: запись туда испортила бы рукопожатие.',
    "This profile renumbers WireGuard's message types ({keys}). The peer expects that numbering and Xray speaks the standard one, so this outbound will not complete a handshake with it. The decoys below were still imported.":
        'Профиль меняет номера типов сообщений WireGuard ({keys}). Пир ожидает именно такую нумерацию, а Xray использует стандартную, поэтому рукопожатие с ним не состоится. Обманки ниже всё же импортированы.',
    "Not carried across: {keys}. This app models WireGuard plus AmneziaWG's decoys; anything else in the profile is left behind.":
        'Не перенесено: {keys}. Приложение описывает WireGuard и обманки AmneziaWG; всё остальное из профиля остаётся за бортом.',
    'AmneziaWG carries five decoy packets (I1-I5); the last {n} were left out.':
        'AmneziaWG вмещает пять пакетов-обманок (I1–I5); последние {n} не вошли.',
    'AmneziaWG sends all five I packets before its junk, so a packet written after a junk step moves ahead of it.':
        'AmneziaWG отправляет все пять пакетов I до мусора, поэтому пакет, записанный после шага с мусором, окажется перед ним.',
    'Delays were dropped: AmneziaWG writes its decoys back to back.':
        'Паузы не перенесены: AmneziaWG отправляет обманки подряд.',
    '"reset" was dropped: AmneziaWG sends its decoys before every handshake rather than re-arming after silence.':
        'Поле «reset» не перенесено: AmneziaWG отправляет обманки перед каждым рукопожатием, а не после паузы в тишине.',
    'AmneziaWG\'s junk is always uniform random bytes, so a narrowed "randRange" was dropped.':
        'Мусор в AmneziaWG — всегда равномерно случайные байты, поэтому суженный «randRange» не перенесён.',
    'AmneziaWG has one junk setting (Jc/Jmin/Jmax), so {steps} junk steps became {count} packets of {min}-{max} bytes.':
        'В AmneziaWG одна настройка мусора (Jc/Jmin/Jmax), поэтому {steps} шагов превратились в {count} пакетов по {min}–{max} байт.',
    'An AmneziaWG chain with no tags sends an empty datagram.':
        'Цепочка AmneziaWG без тегов отправляет пустую датаграмму.',
    'A packet with no bytes sends an empty datagram.':
        'Пакет без байт отправляет пустую датаграмму.',
    '"{size}" is not a length range — the core refuses the config.':
        '«{size}» — не диапазон длины, ядро не примет такой конфиг.',
    'A junk length cannot be negative.':
        'Длина мусора не может быть отрицательной.',
    'A junk step that sends nothing.':
        'Шаг с мусором, который ничего не отправляет.',
    '"{label}..." is {size} bytes — RFC 1035 s2.3.4 caps a label at {max}, so it is sent cut short and the decoy asks about a different name.':
        '«{label}…» занимает {size} байт, а RFC 1035 п.2.3.4 ограничивает метку {max} байтами, поэтому она будет обрезана и обманка спросит про другое имя.',
    'The name is {total} bytes — RFC 1035 s2.3.4 caps an encoded name at 255, which is {max} as written here. A resolver would refuse to parse it.':
        'Имя занимает {total} байт, а RFC 1035 п.2.3.4 ограничивает закодированное имя 255 байтами, то есть {max} в такой записи. Резолвер откажется его разбирать.',
    'RFC 3261 s8.1.1.7 wants the branch to start with "z9hG4bK" — "{branch}" does not.':
        'RFC 3261 п.8.1.1.7 требует, чтобы branch начинался с «z9hG4bK», а «{branch}» — нет.',
    '{label} is empty — the URI it goes in will not parse as SIP.':
        'Поле «{label}» пустое — URI, в который оно подставляется, не разберётся как SIP.',
    'SOFTWARE is {chars} characters — RFC 5389 s15.10 wants fewer than {max}.':
        'SOFTWARE содержит {chars} символов, а RFC 5389 п.15.10 требует меньше {max}.',
    'SOFTWARE is {bytes} bytes — RFC 5389 s15.10 caps the attribute at {max}.':
        'SOFTWARE занимает {bytes} байт, а RFC 5389 п.15.10 ограничивает атрибут {max} байтами.',

    'The opening of a VoIP call. A text protocol, so it reads as words in the dump. Normally port 5060.':
        'Начало VoIP-звонка. Текстовый протокол, поэтому в дампе читается словами. Обычный порт — 5060.',
    'The first packet of a QUIC connection, carrying a real TLS ClientHello. The server name inside it travels in the clear — it is the one field anyone on the path reads. Normally port 443.':
        'Первый пакет QUIC-соединения с настоящим TLS ClientHello внутри. Имя сервера в нём идёт открытым текстом — это единственное поле, которое читает любой на пути. Обычный порт — 443.',
    'The most ordinary UDP packet there is, and the smallest of these. Normally port 53.':
        'Самый обычный UDP-пакет в сети и самый маленький из здешних. Обычный порт — 53.',
    'How a WebRTC call starts. Without the SOFTWARE attribute it is a bare 20-byte header, which is the commonest shape on the wire. Normally port 3478.':
        'С этого начинается WebRTC-звонок. Без атрибута SOFTWARE это голый 20-байтный заголовок — самая частая его форма в сети. Обычный порт — 3478.',
    'An I1-I5 line from an AmneziaWG profile, kept as its tags so it can be written back unchanged.':
        'Строка I1–I5 из профиля AmneziaWG. Хранится тегами, поэтому выгружается обратно без изменений.',
    "Bytes exactly as entered — for repeating a packet from someone else's capture or profile.":
        'Байты ровно как введены — чтобы повторить пакет из чужого дампа или профиля.',
    'These are datagrams sent ahead of the real traffic, once per destination. They change nothing about the real packets — the core sends the list, then carries on as usual.':
        'Это датаграммы, которые уходят перед настоящим трафиком, один раз на каждый адрес. Сами настоящие пакеты они никак не меняют: ядро отправляет список и дальше работает как обычно.',
    'Every decoy goes to the same address and port as the real traffic, one after another, before a single real byte. So the list reads as one flow to one endpoint: a single kind plus junk usually looks more like an application than a mixture does.':
        'Все обманки уходят на тот же адрес и порт, что и настоящий трафик, подряд, до единого настоящего байта. Поэтому список читается как один поток к одному узлу: один вид плюс мусор обычно выглядит убедительнее смеси.',
    "A SIP call opening. Everything below ends up in the packet as plain text, which is what makes it read as somebody's softphone.":
        'Начало SIP-звонка. Всё, что ниже, попадает в пакет открытым текстом — именно это и делает его похожим на чей-то софтфон.',
    'A real QUIC client Initial: encrypted the way the protocol says, carrying a TLS ClientHello. Only the server name below is readable on the path.':
        'Настоящий клиентский QUIC Initial: зашифрован так, как требует протокол, внутри TLS ClientHello. На пути читается только имя сервера, заданное ниже.',
    'A DNS query. It is never resolved — the datagram goes to the peer, not to a resolver — so the name only has to read like a name.':
        'DNS-запрос. Он никогда не будет разрешён — датаграмма идёт пиру, а не резолверу, — поэтому имени достаточно просто выглядеть именем.',
    'A STUN Binding request, the packet a WebRTC call starts with.':
        'Запрос STUN Binding — пакет, с которого начинается WebRTC-звонок.',
    'A tag chain copied from an AmneziaWG profile. AmneziaWG redraws its random tags before every handshake; carried here they are frozen at one draw.':
        'Цепочка тегов из профиля AmneziaWG. Сам AmneziaWG перерисовывает случайные теги перед каждым рукопожатием, здесь же они заморожены на одном значении.',
    'Raw bytes. Nothing is generated and nothing is checked beyond the hex itself.':
        'Произвольные байты. Ничего не генерируется и не проверяется, кроме самой шестнадцатеричной записи.',
    'This chain sends a SIP request and a SIP reply ({replies}) from the same end. In a real call the reply comes back from the other side, so the two together are not a conversation anyone has. Keep the request, or send the reply on its own.':
        'Цепочка отправляет с одной стороны и SIP-запрос, и SIP-ответ ({replies}). В настоящем звонке ответ приходит с другой стороны, поэтому вместе они не похожи ни на один реальный разговор. Оставьте либо запрос, либо только ответ.',
    'These decoys imitate {count} protocols ({names}) on one address and port. A real flow is one application, so a single kind — plus junk — usually reads better than a mixture.':
        'Обманки изображают {count} протокола ({names}) на одном адресе и порту. Настоящий поток — это одно приложение, поэтому один вид плюс мусор обычно выглядит убедительнее смеси.',
    '{n} datagrams go out before the first real one. A long burst is a shape of its own; the WARP profiles send five or six.':
        'До первой настоящей датаграммы уходит {n}. Длинная очередь — сама по себе приметный признак; профили WARP отправляют пять-шесть.',

    'L4 · Transport': 'L4 · Транспорт',
    'This outbound dials as usual, and the socket underneath is opened through the other one. Its own transport, security and sockopt all apply.':
        'Этот outbound подключается как обычно, а сокет под ним открывается через другой outbound. Его собственные транспорт, защита и sockopt применяются полностью.',
    'L7 · Application': 'L7 · Приложение',
    'The other outbound carries the stream to the destination. Of this outbound\'s own stream settings only TLS is used.':
        'Поток до адресата несёт другой outbound. Из собственных настроек транспорта этого outbound используется только TLS.',
    'Sends this outbound\'s connections through another outbound first — for example WireGuard through a freedom outbound that carries the obfuscation. Pick the outbound to go through, then the layer.':
        'Пускает соединения этого outbound сначала через другой — например, WireGuard через freedom, на котором висит обфускация. Выберите, через какой outbound идти, затем уровень.',
    'Direct (None)': 'Напрямую (нет)',
    'Not chained: this outbound opens its own connections.':
        'Без цепочки: этот outbound сам открывает свои соединения.',
    'Chaining layer': 'Уровень цепочки',
    'Unchain': 'Убрать цепочку',
    'Both proxySettings and sockopt.dialerProxy name an outbound here. Xray refuses the config for that. Pick a layer above to keep one of them.':
        'Здесь outbound указан и в proxySettings, и в sockopt.dialerProxy. Xray такой конфиг не принимает. Выберите уровень выше, чтобы оставить что-то одно.',
    'Switch to the transport layer': 'Перейти на транспортный уровень',
    'Xray {tag} refuses any proxySettings, and the config does not load. The transport layer is the only chaining it has.':
        'Xray {tag} отвергает любой proxySettings, и конфиг не загружается. Транспортный уровень — единственный вид цепочки, который у него есть.',
    'Runs on Xray 26.3 and 26.7. From 26.9 the core refuses the config instead — the transport layer is what survives an upgrade.':
        'Работает на Xray 26.3 и 26.7. Начиная с 26.9 ядро отвергает такой конфиг — обновление переживёт только транспортный уровень.',
    'Not used while chained at this layer: {list}. Only TLS from this outbound\'s stream settings is applied; the transport layer is the one that runs them.':
        'При цепочке на этом уровне не используется: {list}. Из настроек транспорта этого outbound применяется только TLS; чтобы они заработали, нужен транспортный уровень.',
    'Rewrite as sockopt.dialerProxy': 'Переписать как sockopt.dialerProxy',
    'Written the old way, as proxySettings with transportLayer. The core turns that into sockopt.dialerProxy when it loads, so it runs the same — and 26.9 refuses it instead.':
        'Записано по-старому: proxySettings с transportLayer. При загрузке ядро само превращает это в sockopt.dialerProxy, так что работает так же, — а 26.9 такой конфиг отвергает.',
    'Outbound "{tag}" sets both proxySettings and sockopt.dialerProxy. Xray refuses the config: an outbound is chained one way or the other, never both.':
        'Outbound «{tag}» задаёт и proxySettings, и sockopt.dialerProxy. Xray такой конфиг не принимает: цепочка задаётся либо так, либо так, но не обоими способами сразу.',
    'Keep one of them — the Proxy Chaining card in the outbound picks the layer and clears the other.':
        'Оставьте что-то одно: карточка «Цепочка прокси» в outbound выбирает уровень и убирает второй ключ.',
    'Outbound "{tag}" goes out through "{via}", and there is no outbound with that tag. Every connection it is given will fail.':
        'Outbound «{tag}» идёт через «{via}», а outbound с таким тегом нет. Каждое соединение, которое ему достанется, оборвётся.',
    'Outbound "{tag}" is chained through itself, so nothing ever opens the connection.':
        'Outbound «{tag}» пущен через самого себя, поэтому соединение не открывает никто.',
    'Outbound "{tag}" is part of a chain that comes back to itself (through "{via}"), so nothing at the end of it opens a connection.':
        'Outbound «{tag}» входит в цепочку, которая замыкается сама на себя (через «{via}»), поэтому в её конце некому открыть соединение.',
    'Goes out through {via} at the transport layer: this outbound dials as usual and the socket underneath is opened by {via}.':
        'Идёт через {via} на транспортном уровне: этот outbound подключается как обычно, а сокет под ним открывает {via}.',
    'Goes out through {via} at the application layer: {via} carries the stream, and of this outbound\'s own stream settings only TLS is used. Xray 26.9 refuses this form.':
        'Идёт через {via} на уровне приложения: поток несёт {via}, а из собственных настроек транспорта используется только TLS. Xray 26.9 такую запись отвергает.',
    'Carries the connections of: {tags}. They go out through this outbound, which is why it needs no routing rule of its own.':
        'Несёт соединения: {tags}. Они выходят через этот outbound, поэтому собственное правило маршрутизации ему не нужно.',
    'Fragmentation needs a length: the core refuses the config without one.':
        'Фрагментации нужна длина: без неё ядро не примет конфиг.',
    'The length cannot start at 0: the core refuses a fragment of no bytes.':
        'Длина не может начинаться с 0: фрагмент в ноль байт ядро не принимает.',
    'Fragmentation needs an interval: the core refuses the config without one.':
        'Фрагментации нужен интервал: без него ядро не примет конфиг.',
    'Needs Xray on the far end — any Xray inbound answers Mux, a plain proxy of the same protocol does not.':
        'На другой стороне должен быть Xray: любой его inbound понимает Mux, а обычный прокси того же протокола — нет.',
    'This protocol cannot carry Mux: it would try to reach the Mux address for real. It is shown because the config has it — switch it off to remove it.':
        'Этот протокол не может нести Mux: он попытался бы по-настоящему подключиться к служебному адресу Mux. Блок показан потому, что он есть в конфиге, — выключите, чтобы убрать.',
    'This outbound carries streamSettings, and a {protocol} outbound never opens a connection to use them. The core still reads and checks them when it loads.':
        'В этом outbound есть streamSettings, а outbound протокола {protocol} не открывает соединений и ими не пользуется. При загрузке ядро всё равно читает и проверяет их.',
    'A noise needs a type of rand, str, hex or base64, written exactly so: the core refuses anything else.':
        'Шуму нужен тип rand, str, hex или base64, записанный именно так: всё остальное ядро отвергает.',
    'A rand noise needs a length or a range, like 50-100: the core refuses the config without one.':
        'Шуму типа rand нужна длина или диапазон, например 50-100: без этого ядро не примет конфиг.',
    'A rand noise cannot start at 0 bytes: the core refuses it.':
        'Шум типа rand не может начинаться с 0 байт: ядро его отвергает.',
    'Not hex: pairs of 0-9 and a-f are what the core decodes.':
        'Не шестнадцатеричное значение: ядро разбирает пары из 0-9 и a-f.',
    'Not base64: the core cannot decode it.': 'Не base64: ядро не сможет это раскодировать.',
    'The login this proxy asks for. Leave both boxes empty for a proxy that takes anyone.':
        'Логин, который требует этот прокси. Оставьте оба поля пустыми, если прокси пускает всех.',
    'A password with no user name: the proxy would be offered an empty login.':
        'Пароль без имени пользователя: прокси получит пустой логин.',
    'Hysteria\'s password is not set here: it is the transport\'s Auth, under Stream Settings below.':
        'Пароль Hysteria задаётся не здесь: это поле Auth транспорта, в настройках потока ниже.',
    'Rate': 'Скорость',
    'bytes/s': 'байт/с',
    'How fast the forwarded traffic may flow once the limit applies. Empty or 0 is no limit at all, and the two fields beside it then do nothing.':
        'С какой скоростью может идти перенаправленный трафик, когда лимит действует. Пусто или 0 — лимита нет вовсе, и два соседних поля тогда ни на что не влияют.',
    'Free allowance': 'Без ограничения',
    'bytes': 'байт',
    'This much of each connection passes at full speed before the limit starts.':
        'Столько байт каждого соединения проходит на полной скорости, прежде чем включается лимит.',
    'Burst': 'Всплеск',
    'How much may pass in one go after a quiet moment — the size of the token bucket, in bytes despite the key\'s name. Raised to the rate when set lower.':
        'Сколько может пройти разом после паузы — размер «ведра» токенов, в байтах, несмотря на название ключа. Если задано меньше скорости, поднимается до неё.',
    'Fallback upload limit': 'Лимит отдачи для fallback',
    'Fallback download limit': 'Лимит загрузки для fallback',
    'REALITY hands every connection that is not one of its own clients on to the target site. These limits apply to those forwarded connections only, never to your clients\' traffic — they keep the server from being a free relay to the target.':
        'REALITY передаёт на целевой сайт каждое соединение, которое не принадлежит его клиентам. Эти лимиты действуют только на такие перенаправленные соединения и никогда на трафик ваших клиентов — они не дают серверу стать бесплатным ретранслятором к целевому сайту.',
    'Caps what a forwarded connection may send on to the target — visitor to target.':
        'Ограничивает то, что перенаправленное соединение отправляет на целевой сайт: от посетителя к цели.',
    'Caps what the target may send back over a forwarded connection — target to visitor.':
        'Ограничивает то, что целевой сайт отправляет обратно по перенаправленному соединению: от цели к посетителю.',
    'With no rate set, Xray does not limit this direction — the other values here do nothing.':
        'Пока скорость не задана, Xray это направление не ограничивает — остальные значения здесь ни на что не влияют.',
    'Remove this limit': 'Убрать этот лимит',
    'ECH Query Socket Options (echSockopt)': 'Параметры сокета для запроса ECH (echSockopt)',
    'Socket options for the DNS query that fetches the ECH config. Xray makes that query only when ECH Config List names a DNS server instead of holding the config itself, so without one these do nothing.':
        'Параметры сокета для DNS-запроса, которым получают конфиг ECH. Xray делает этот запрос, только когда в ECH Config List указан DNS-сервер, а не сам конфиг, — без него эти параметры ни на что не влияют.',
    'This key takes a JSON list, in square brackets — the config keeps the last valid value.':
        'Этот ключ принимает JSON-список в квадратных скобках — в конфиге остаётся последнее корректное значение.',
    'This key takes a JSON object, in braces — the config keeps the last valid value.':
        'Этот ключ принимает JSON-объект в фигурных скобках — в конфиге остаётся последнее корректное значение.',
    'SHA-256 of the certificate to expect — the server\'s own, or a CA in the chain it sends — as 64 hex digits. Colons between bytes are fine, and several hashes go in this one field separated by commas. `xray tls hash --cert fullchain.pem` prints it. Not Base64: Xray refuses the config when this is anything but hex.':
        'SHA-256 ожидаемого сертификата — самого сервера или УЦ из цепочки, которую он присылает, — в виде 64 шестнадцатеричных цифр. Двоеточия между байтами допустимы, несколько хешей пишутся в это же поле через запятую. Хеш печатает `xray tls hash --cert fullchain.pem`. Не Base64: если здесь не hex, Xray не примет конфиг.',
    '64 hex digits, e.g. e3b0c44298fc1c14…7852b855':
        '64 шестнадцатеричные цифры, например e3b0c44298fc1c14…7852b855',
    '{name} holds {value}, and Xray reads an object here — it cannot read the config until this is replaced or removed.':
        'В {name} записано {value}, а Xray ждёт здесь объект — он не прочитает конфиг, пока это не заменить или не убрать.',
    'Set its three numbers in the REALITY settings, or remove the key.':
        'Задайте три его числа в настройках REALITY или уберите ключ.',
    'This is not text, and Xray {tag} reads text here — it cannot read the config. Write the hashes on one line, separated by commas.':
        'Это не текст, а Xray {tag} ждёт здесь текст — он не прочитает конфиг. Запишите хеши одной строкой через запятую.',
    '“{entry}” is not hex. Xray {tag} reads each hash as 64 hex digits and refuses the config otherwise — a Base64 hash has to be converted first.':
        '«{entry}» — не шестнадцатеричное значение. Xray {tag} читает каждый хеш как 64 hex-цифры и иначе не принимает конфиг; хеш в Base64 нужно сначала перевести.',
    '“{entry}” has {n} hex digits where a SHA-256 hash has 64 — Xray {tag} refuses the config.':
        'В «{entry}» {n} hex-цифр, а у хеша SHA-256 их 64 — Xray {tag} не примет конфиг.',
    'There is no hash in this value, so Xray {tag} pins nothing and checks the certificate the ordinary way.':
        'В этом значении нет ни одного хеша, поэтому Xray {tag} ничего не закрепляет и проверяет сертификат обычным образом.',
    '{key} holds {value}; it has to be a whole number of bytes, 0 or more — Xray {tag} cannot read the config otherwise.':
        'В {key} записано {value}; здесь должно быть целое число байт, 0 или больше, — иначе Xray {tag} не прочитает конфиг.',
    '{key} has to be an object — Xray {tag} cannot read the config with anything else there.':
        '{key} должен быть объектом — с чем-либо другим Xray {tag} не прочитает конфиг.',
    '{protocol} settings': 'Настройки {protocol}',
    '{protocol} accounts': 'Учётные записи {protocol}',
    'One port for SOCKS and HTTP proxy clients alike. Xray builds it exactly as it builds a socks inbound, so the settings are the same.':
        'Один порт и для SOCKS-, и для HTTP-клиентов. Xray собирает его точно так же, как inbound socks, поэтому настройки те же.',
    'WireGuard interface': 'Интерфейс WireGuard',
    'This server\'s private key. It stays in this config; clients are given the public key under it.':
        'Приватный ключ этого сервера. Он остаётся в этом конфиге; клиентам выдают публичный ключ, показанный ниже.',
    'Worked out from the secret key, not stored in the config. Every client needs it as the public key of its peer.':
        'Вычисляется из секретного ключа и в конфиге не хранится. Каждому клиенту он нужен как публичный ключ его пира.',
    'Appears once the secret key is a valid one. Every client needs it as the public key of its peer.':
        'Появится, когда секретный ключ станет корректным. Каждому клиенту он нужен как публичный ключ его пира.',
    'Interface address': 'Адрес интерфейса',
    'The server\'s own addresses inside the tunnel, separated by commas. Left empty, Xray uses {v4} and {v6}.':
        'Собственные адреса сервера внутри туннеля, через запятую. Если оставить пустым, Xray возьмёт {v4} и {v6}.',
    'The largest packet the tunnel carries. Left empty, Xray uses 1420.':
        'Самый большой пакет, который проходит через туннель. Если оставить пустым, Xray возьмёт 1420.',
    '{key} is an empty list, which is not the same as leaving it out: Xray then uses none at all, not its default.':
        '{key} — пустой список, а это не то же самое, что отсутствие ключа: Xray тогда не берёт ничего вовсе, а не значение по умолчанию.',
    '{key} is set to {value}. Only a WireGuard outbound uses it — on an inbound it changes nothing.':
        'В {key} записано {value}. Этот ключ использует только outbound WireGuard — на inbound он ничего не меняет.',
    'Arrived in Xray 26.7; {tag} drops it, so it does nothing here.':
        'Появилось в Xray 26.7; {tag} это отбрасывает, поэтому здесь оно ни на что не влияет.',
    'A new key gives this server a new public key. Every client set up with the old one stops connecting until it is given the new one.':
        'С новым ключом у сервера будет новый публичный ключ. Все клиенты, настроенные на старый, перестанут подключаться, пока не получат новый.',
    'Replace the key': 'Заменить ключ',
    'Generate a new key': 'Сгенерировать новый ключ',
    'Generate a key': 'Сгенерировать ключ',
    'Copy public key': 'Скопировать публичный ключ',
    'Each peer is one client. It is recognised by its public key and may only send from the addresses listed for it, so give every client an address of its own.':
        'Каждый пир — один клиент. Его узнают по публичному ключу, и слать он может только с перечисленных для него адресов, поэтому дайте каждому клиенту свой адрес.',
    'Peer {n}': 'Пир {n}',
    'The client\'s own public key — the one its WireGuard app shows for its interface, not this server\'s.':
        'Публичный ключ самого клиента — тот, что его приложение WireGuard показывает для своего интерфейса, а не ключ этого сервера.',
    'The tunnel addresses this client may send from, as networks: a single address is written with /32. Left empty, Xray lets the peer use every address.':
        'Адреса туннеля, с которых этот клиент может слать, в виде сетей: один адрес пишется с /32. Если оставить пустым, Xray разрешит пиру любые адреса.',
    'An extra secret shared with this one client, which must hold the same value. Optional.':
        'Дополнительный секрет, общий с этим одним клиентом: у него должно быть то же значение. Необязательно.',
    'Generate a pre-shared key': 'Сгенерировать pre-shared ключ',
    'Seconds between the packets this server sends to keep the peer\'s path open. Empty or 0 sends none.':
        'Интервал в секундах между пакетами, которыми сервер держит путь к пиру открытым. Пусто или 0 — не слать.',
    'The user this peer\'s traffic is counted and routed as.':
        'Пользователь, от имени которого трафик этого пира считается и маршрутизируется.',
    'The policy level this peer\'s connections run at. Empty is level 0.':
        'Уровень политики, на котором работают соединения этого пира. Пусто — уровень 0.',
    'Where Xray {tag} first sends to this peer. A server usually leaves it out and learns the address when the peer calls.':
        'Куда Xray {tag} отправляет первый пакет этому пиру. Сервер обычно его не задаёт и узнаёт адрес, когда пир выходит на связь сам.',
    'Xray {tag} does not use a peer\'s endpoint on an inbound: it learns the address when the peer calls. It does nothing here.':
        'Xray {tag} не использует endpoint пира на inbound: адрес он узнаёт, когда пир выходит на связь. Здесь это ни на что не влияет.',
    'Remove peer': 'Удалить пир',
    'No peers yet. The inbound loads without any — and nobody can connect to it.':
        'Пиров пока нет. Inbound загрузится и без них — но подключиться к нему никто не сможет.',
    'A key is 32 bytes — 44 characters of base64, or 64 of hex.':
        'Ключ — это 32 байта: 44 символа base64 или 64 символа hex.',
    '{what} is not a WireGuard key: Xray cannot decode it, and the config will not load.':
        '{what} — не ключ WireGuard: Xray не сможет его раскодировать, и конфиг не загрузится.',
    '{what} decodes to {bytes} bytes and a WireGuard key is 32, so the inbound will not start.':
        '{what} раскодируется в {bytes} байт, а ключ WireGuard — это 32, поэтому inbound не запустится.',
    '{what} is empty. Every supported Xray refuses a WireGuard inbound without its secret key — the config will not load.':
        '{what} не задан. Любой поддерживаемый Xray отвергает inbound WireGuard без секретного ключа — конфиг не загрузится.',
    'Generate one in the WireGuard card, or paste the key this server already uses.':
        'Сгенерируйте его в карточке WireGuard или вставьте ключ, которым этот сервер уже пользуется.',
    '{what} lists "{value}", which is not an IP address — the inbound will not start.':
        'В {what} указано «{value}», а это не IP-адрес — inbound не запустится.',
    '{what} lists "{value}": Xray {tag} takes an interface address only as a single host — /32 for IPv4, /128 for IPv6 — and refuses any other prefix.':
        'В {what} указано «{value}»: Xray {tag} принимает адрес интерфейса только как один хост — /32 для IPv4, /128 для IPv6 — и отвергает любой другой префикс.',
    '{what} must be empty or exactly 3 bytes; Xray refuses any other length and the config will not load.':
        '{what} должен быть пустым или ровно из 3 байт; любую другую длину Xray отвергает, и конфиг не загрузится.',
    'An inbound does not use it — only a WireGuard outbound does — so it can simply be removed.':
        'Inbound его не использует — только outbound WireGuard, — поэтому его можно просто убрать.',
    '{what} is empty. A peer is known by its public key, so nothing can connect as this one.':
        '{what} не задан. Пира узнают по публичному ключу, поэтому под этим никто подключиться не сможет.',
    '{what} is empty. A peer is known by its public key, and Xray {tag} refuses the inbound without one — the config will not load.':
        '{what} не задан. Пира узнают по публичному ключу, и Xray {tag} отвергает inbound без него — конфиг не загрузится.',
    '{what} is empty. A peer is known by its public key; Xray {tag} leaves the key out and sends the peer\'s other settings on their own.':
        '{what} не задан. Пира узнают по публичному ключу; Xray {tag} пропускает ключ и передаёт остальные настройки пира без него.',
    'Paste the public key the client shows for its own interface, or remove the peer.':
        'Вставьте публичный ключ, который клиент показывает для своего интерфейса, или удалите пир.',
    '{what} lists "{value}", which is not a network written as address/prefix — the inbound will not start.':
        'В {what} указано «{value}», а это не сеть в виде адрес/префикс — inbound не запустится.',
    'Write a single address as {example}.': 'Один адрес записывается как {example}.',
    'Automatic': 'Автоматически',
    'or an interface name, e.g. eth0': 'или имя интерфейса, например eth0',
    'Not set: Xray does not bind its own connections to an interface.':
        'Не задано: Xray не привязывает свои соединения к интерфейсу.',
    'Off: Xray\'s own connections are not bound to an interface, so they follow the system routes.':
        'Выключено: собственные соединения Xray не привязаны к интерфейсу и идут по системным маршрутам.',
    'Not set: Xray uses "auto", because autoSystemRoutingTable lists routes.':
        'Не задано: Xray берёт «auto», потому что в autoSystemRoutingTable перечислены маршруты.',
    '"auto": Xray chooses the interface for its own connections itself, and never the TUN.':
        '«auto»: Xray сам выбирает интерфейс для своих соединений — и никогда не TUN.',
    'Pinned: Xray binds its own connections to the interface {name}.':
        'Закреплено: Xray привязывает свои соединения к интерфейсу {name}.',
    '{name} holds {value}, and Xray reads text here — it cannot read the config until this is replaced or removed.':
        'В {name} записано {value}, а Xray ждёт здесь текст — он не прочитает конфиг, пока это не заменить или не убрать.',
    'Xray {tag} matches 2022 method names exactly, in lower case: write {name}.':
        'Xray {tag} сравнивает имена методов 2022 точно, в нижнем регистре: напишите {name}.',
    'A 2022 key is {need} random bytes in base64: openssl rand -base64 {need} writes one.':
        'Ключ 2022 — это {need} случайных байт в base64: его выдаёт openssl rand -base64 {need}.',
    '{what} is empty, and Xray {tag} cannot run a 2022 method without its key — the config will not load.':
        '{what} не задан, а без ключа Xray {tag} не может работать с методом 2022 — конфиг не загрузится.',
    '{what} is not base64. Xray {tag} decodes a 2022 key from base64 and refuses the config when it cannot.':
        '{what} — не base64. Xray {tag} раскодирует ключ 2022 из base64 и отвергает конфиг, если не может.',
    '{what} decodes to {bytes} bytes, and {method} needs a key of at least {need} — Xray {tag} refuses the config.':
        '{what} раскодируется в {bytes} байт, а {method} нужен ключ не короче {need} — Xray {tag} отвергает конфиг.',
    '{what} is {bytes} bytes, and {method} takes a key of exactly {need} — Xray {tag} refuses the config.':
        '{what} — {bytes} байт, а {method} принимает ключ ровно из {need} — Xray {tag} отвергает конфиг.',
    '{what} is {shown}: with users listed, Xray {tag} serves only the AES 2022 methods — the config will not load.':
        '{what} — {shown}: при списке пользователей Xray {tag} обслуживает только AES-методы 2022 — конфиг не загрузится.',
    'Use 2022-blake3-aes-128-gcm or 2022-blake3-aes-256-gcm, or list no users to serve one key.':
        'Используйте 2022-blake3-aes-128-gcm или 2022-blake3-aes-256-gcm либо уберите список пользователей и обслуживайте один ключ.',
    '{what} is {shown}. With a 2022 method a user is told apart by its key alone, and Xray {tag} refuses a method on it — the config will not load.':
        '{what} — {shown}. С методом 2022 пользователя отличают только по ключу, и метод у пользователя Xray {tag} отвергает — конфиг не загрузится.',
    'Remove the method from this user.': 'Уберите метод у этого пользователя.',
    '{what} is missing. Once the first user has an address this inbound is a relay, and Xray {tag} wants an address on every user.':
        '{what} не задан. Раз у первого пользователя есть адрес, этот inbound — ретранслятор, и Xray {tag} требует адрес у каждого пользователя.',
    '{what} is empty, and Xray {tag} refuses a Shadowsocks account without a password — the config will not load.':
        '{what} не задан, а учётную запись Shadowsocks без пароля Xray {tag} отвергает — конфиг не загрузится.',
    '{what} is {shown}, which Xray {tag} does not know as a Shadowsocks cipher — the config will not load.':
        '{what} — {shown}, такого шифра Shadowsocks Xray {tag} не знает — конфиг не загрузится.',
    '{what} is {shown}, which is not an AEAD cipher — Xray {tag} refuses a user without one and the config will not load.':
        '{what} — {shown}, а это не AEAD-шифр; пользователя без такого шифра Xray {tag} отвергает, и конфиг не загрузится.',
    'The relay WARP accounts are registered through. Leave it empty for the one built into the editor; to use your own, deploy workers/warp from the repository and enter its address and key.':
        'Ретранслятор, через который регистрируются аккаунты WARP. Оставьте пустым, чтобы использовать встроенный в редактор; для своего задеплойте workers/warp из репозитория и укажите его адрес и ключ.',
    'Worker key': 'Ключ воркера',
    'The access key your worker expects: one of its BUILT_IN_KEYS or its ACCESS_KEYS secret. Sent as X-Xcui-Key.':
        'Ключ доступа, который ждёт ваш воркер: один из его BUILT_IN_KEYS или секрет ACCESS_KEYS. Передаётся в заголовке X-Xcui-Key.',
    'The built-in relay uses the key built into the editor; this box counts once a URL of your own is entered.':
        'Встроенный ретранслятор использует ключ, встроенный в редактор; это поле действует, когда указан ваш собственный URL.',
    'Your worker\'s key': 'Ключ вашего воркера',
    'Built in': 'Встроенный',
    'Hide': 'Скрыть',
    'Show': 'Показать',
    'Checking…': 'Проверка…',
    'Check the relay': 'Проверить воркер',
    'The relay answers and takes the key.': 'Воркер отвечает и принимает ключ.',
    'Needs Xray 26.10 or newer': 'Нужен Xray 26.10 или новее',
    'Registers a new Cloudflare WARP device and enrols a key for MASQUE on it. The outbound reaches Cloudflare over HTTP/3 — QUIC on UDP 443, like the official app\'s MASQUE mode — instead of WireGuard. The key is made in this browser and never sent anywhere.':
        'Регистрирует новое устройство Cloudflare WARP и привязывает к нему ключ для MASQUE. Outbound подключается к Cloudflare по HTTP/3 — QUIC на UDP 443, как официальное приложение в режиме MASQUE, — а не по WireGuard. Ключ создаётся в этом браузере и никуда не отправляется.',
    'MASQUE needs Xray 26.10 or newer, which connects to WARP over it by itself; the editor targets {tag}. Pick the newer line in Settings → General to use it.':
        'Для MASQUE нужен Xray 26.10 или новее — он сам подключается к WARP по этому протоколу; редактор сейчас настроен на {tag}. Чтобы воспользоваться, выберите более новую линию в Настройки → Общие.',
    'Every machine that runs this config needs Xray 26.10 or newer: older cores either have no masque or cannot speak Cloudflare\'s version of it.':
        'На каждой машине, где работает этот конфиг, нужен Xray 26.10 или новее: в более старых ядрах либо нет masque, либо они не понимают вариант Cloudflare.',
    'There is no allowed-IPs list here. Keep local networks off the tunnel with a routing rule that sends them to direct.':
        'Списка allowedIPs здесь нет. Чтобы локальные сети не шли в туннель, отправьте их в direct правилом маршрутизации.',
    'Where UDP is blocked, set the outbound\'s TLS ALPN to h2 to use HTTP/2 over TCP instead.':
        'Если UDP заблокирован, поставьте в TLS этого outbound ALPN h2 — тогда пойдёт HTTP/2 поверх TCP.',
    'The WARP relay refused the access key. Check the worker key in Settings.':
        'Воркер WARP не принял ключ доступа. Проверьте ключ воркера в настройках.',
    'The WARP relay does not serve this site. A self-hosted editor needs its address in the relay\'s ALLOWED_ORIGINS.':
        'Воркер WARP не обслуживает этот сайт. Для редактора на своём хостинге добавьте его адрес в ALLOWED_ORIGINS воркера.',
    'Cloudflare is limiting registrations right now. Wait a minute and try again.':
        'Cloudflare сейчас ограничивает регистрации. Подождите минуту и попробуйте снова.',
    'That URL does not answer as a WARP relay. Check the worker URL in Settings.':
        'По этому адресу не отвечает воркер WARP. Проверьте URL воркера в настройках.',
    'The WARP relay could not be reached: {message}': 'Не удалось связаться с воркером WARP: {message}',
    'WARP registration failed: {message}': 'Регистрация WARP не удалась: {message}',
    'WARP over MASQUE added as {tag}': 'WARP через MASQUE добавлен как {tag}',
    'WARP did not register': 'WARP не зарегистрировался',
    'Press Generate WARP in the WireGuard card: it registers a device with Cloudflare and fills in the key, the peer\'s public key and the addresses.':
        'Нажмите Generate WARP в карточке WireGuard: она зарегистрирует устройство в Cloudflare и заполнит ключ, публичный ключ пира и адреса.',
    '{what} is empty. Every supported Xray refuses a WireGuard outbound without its secret key — the config will not load.':
        '{what} не задан. Любой поддерживаемый Xray отвергает outbound WireGuard без секретного ключа — конфиг не загрузится.',
    'Paste the private key this client was given; the matching public key is what the server lists for its peer.':
        'Вставьте приватный ключ, выданный этому клиенту; парный ему публичный ключ сервер указывает для своего пира.',
    '{what} decodes to {bytes} bytes and a WireGuard key is 32, so the tunnel cannot come up and every connection through this outbound fails.':
        '{what} раскодируется в {bytes} байт, а ключ WireGuard — это 32, поэтому туннель не поднимется и все соединения через этот outbound будут падать.',
    '{what} lists "{value}", which is not an IP address — the outbound will not start.':
        'В {what} указано «{value}», а это не IP-адрес — outbound не запустится.',
    'Write it as {example}.': 'Запишите как {example}.',
    'Three numbers from 0 to 255, such as {example} — or remove it.':
        'Три числа от 0 до 255, например {example}, — или уберите.',
    '{what} lists "{value}", which is not an IP address. Xray {tag} reads every entry as one and stops the core from starting on anything else.':
        'В {what} указано «{value}», а это не IP-адрес. Xray {tag} читает каждую запись как адрес и на чём-либо другом не даёт ядру запуститься.',
    'Use an IP address, for example {example}.': 'Укажите IP-адрес, например {example}.',
    '{what} has no peer. A WireGuard outbound has nothing to send through without one: Xray 26.7 and later refuse the config, and 26.3 starts an outbound that fails every connection.':
        'В {what} нет пира. Без него outbound WireGuard некуда отправлять трафик: Xray 26.7 и новее отвергают конфиг, а 26.3 запускает outbound, на котором падает каждое соединение.',
    '{what} has no peer. Xray {tag} refuses a WireGuard outbound without one — the config will not load.':
        'В {what} нет пира. Outbound WireGuard без пира Xray {tag} отвергает — конфиг не загрузится.',
    '{what} has no peer. Xray {tag} starts the outbound, but it has nothing to send through, so every connection fails.':
        'В {what} нет пира. Xray {tag} запускает outbound, но отправлять трафик некуда, поэтому падает каждое соединение.',
    'Add the peer your provider or server gave you: its public key and its endpoint.':
        'Добавьте пир, который выдал провайдер или сервер: его публичный ключ и endpoint.',
    '{what} is empty. A peer is known by its public key, so this one can never connect.':
        '{what} не задан. Пира узнают по публичному ключу, поэтому этот никогда не подключится.',
    '{what} is empty. A peer is known by its public key, and Xray {tag} refuses the outbound without one — the config will not load.':
        '{what} не задан. Пира узнают по публичному ключу, и outbound без него Xray {tag} отвергает — конфиг не загрузится.',
    '{what} is empty. A peer is known by its public key; Xray {tag} leaves it out of the device request, so this peer never connects.':
        '{what} не задан. Пира узнают по публичному ключу; Xray {tag} не передаёт его устройству, поэтому этот пир никогда не подключится.',
    'Paste the server\'s public key — the one that goes with its secret key.':
        'Вставьте публичный ключ сервера — тот, что парный к его секретному ключу.',
    '{what} is empty. A client has to be told where its peer is: Xray 26.7 and later refuse the config, and 26.3 never connects.':
        '{what} не задан. Клиенту нужно знать, где его пир: Xray 26.7 и новее отвергают конфиг, а 26.3 так и не подключается.',
    '{what} is empty. Xray {tag} refuses a WireGuard peer without an endpoint — the config will not load.':
        '{what} не задан. Пир WireGuard без endpoint Xray {tag} отвергает — конфиг не загрузится.',
    '{what} is empty. Xray {tag} leaves it out of the device request, so a client has nowhere to send its handshake and never connects.':
        '{what} не задан. Xray {tag} не передаёт его устройству, поэтому клиенту некуда отправить рукопожатие и он не подключится.',
    'Write it as host:port, for example {example}.': 'Запишите как host:port, например {example}.',
    '{what} is "{value}", which is not host:port, so Xray cannot connect to it and every connection through this outbound fails.':
        '{what} — «{value}», а это не host:port, поэтому Xray не сможет к нему подключиться и все соединения через этот outbound будут падать.',
    '{what} lists "{value}", which is not a network written as address/prefix — the tunnel cannot come up and every connection through this outbound fails.':
        'В {what} указано «{value}», а это не сеть в виде адрес/префикс — туннель не поднимется и все соединения через этот outbound будут падать.',
    '{what} is {value}, but Xray reads an object there. It cannot decode the rule, so the config will not load.':
        '{what} — {value}, а Xray ждёт там объект. Правило не раскодируется, и конфиг не загрузится.',
    'Write it as an object: {example}.': 'Запишите объектом: {example}.',
    'Replace it with an object that has a url, or remove it.': 'Замените объектом с url или уберите.',
    '{what} is {value}, but Xray reads a string there. It cannot decode the rule, so the config will not load.':
        '{what} — {value}, а Xray ждёт там строку. Правило не раскодируется, и конфиг не загрузится.',
    'This rule\'s webhook has no url, so Xray builds no notification for it and nothing is sent.':
        'У webhook этого правила нет url, поэтому Xray не создаёт уведомление и ничего не отправляется.',
    'Set the url to post to, or remove the webhook.': 'Укажите url, на который отправлять, или уберите webhook.',
    '{what} is {value}, but Xray reads a whole number of seconds, zero or more. It cannot decode the rule, so the config will not load.':
        '{what} — {value}, а Xray ждёт целое число секунд, ноль или больше. Правило не раскодируется, и конфиг не загрузится.',
    '{what} is {value}, but Xray reads an object of header names to strings there. It cannot decode the rule, so the config will not load.':
        '{what} — {value}, а Xray ждёт там объект «имя заголовка → строка». Правило не раскодируется, и конфиг не загрузится.',
    '{what} gives "{name}" the value {value}, and header values are strings. Xray cannot decode the rule, so the config will not load.':
        'В {what} заголовку «{name}» задано {value}, а значения заголовков — строки. Xray не раскодирует правило, и конфиг не загрузится.',
    '{what} is {value}, but Xray reads an object of header names to strings there. It cannot decode this outbound, so the config will not load.':
        '{what} — {value}, а Xray ждёт там объект «имя заголовка → строка». Этот outbound не раскодируется, и конфиг не загрузится.',
    'Write it as an object, for example {example}.': 'Запишите объектом, например {example}.',
    '{what} gives "{name}" the value {value}, and header values are strings. Xray cannot decode this outbound, so the config will not load.':
        'В {what} заголовку «{name}» задано {value}, а значения заголовков — строки. Xray не раскодирует этот outbound, и конфиг не загрузится.',
    'Put the value in quotes.': 'Возьмите значение в кавычки.',
    'Extra headers sent with the request that opens the tunnel through this proxy, after the login. A value may use {source} and {target}, which Xray fills in for each connection.':
        'Дополнительные заголовки запроса, который открывает туннель через этот прокси, — после логина. В значении можно использовать {source} и {target}: Xray подставит их для каждого соединения.',
    '{what} holds a value that is not a byte (a whole number from 0 to 255); Xray cannot decode it and the config will not load.':
        'В {what} есть значение, которое не является байтом (целым числом от 0 до 255); Xray не раскодирует его, и конфиг не загрузится.',
    'it is empty': 'он пустой',
    'it is neither a PEM block nor standard base64': 'это не блок PEM и не стандартный base64',
    'it is neither a PKCS #8 nor a SEC 1 private key': 'это не приватный ключ ни в PKCS #8, ни в SEC 1',
    'it is not an ECDSA key on P-256': 'это не ключ ECDSA на P-256',
    'it is not a PKIX public key': 'это не публичный ключ PKIX',
    'WARP\'s own keys are an ECDSA P-256 pair: the private key as PEM or base64 (PKCS #8 or SEC 1), the public key as PEM or base64 (PKIX).':
        'Ключи WARP — пара ECDSA P-256: приватный в PEM или base64 (PKCS #8 или SEC 1), публичный в PEM или base64 (PKIX).',
    '{what} holds {value}, but Xray {tag} reads {expected} there — it cannot read the config until that is fixed.':
        'В {what} записано {value}, а Xray {tag} ждёт там {expected} — он не прочитает конфиг, пока это не исправить.',
    'text': 'текст',
    '{what} cannot be used together with warp — Xray {tag} refuses the config when both are set.':
        '{what} нельзя использовать вместе с warp — если заданы оба, Xray {tag} отвергает конфиг.',
    'WARP signs in with its key. Remove user and pass, or remove warp.':
        'WARP входит по своему ключу. Уберите user и pass либо уберите warp.',
    '{what} is not a usable key: {reason}. Xray {tag} refuses the config.':
        '{what} — непригодный ключ: {reason}. Xray {tag} отвергает конфиг.',
    '{what} is "{value}": it has to start with a slash and may use only the variables target and ipproto, in braces — Xray {tag} refuses the config.':
        '{what} — «{value}»: путь должен начинаться с косой черты и может содержать только переменные target и ipproto в фигурных скобках — Xray {tag} отвергает конфиг.',
    'The default is /.well-known/masque/ip/*/*/ ; leave the path empty to use it.':
        'По умолчанию — /.well-known/masque/ip/*/*/ ; чтобы его использовать, оставьте путь пустым.',
    '{what} is "{value}", which is not a host name with an optional port — Xray {tag} refuses the config.':
        '{what} — «{value}», а это не имя хоста с необязательным портом — Xray {tag} отвергает конфиг.',
    'Write only the name, like example.com or example.com:8443 — no scheme and no path.':
        'Пишите только имя, например example.com или example.com:8443, — без схемы и пути.',
    'an object of text values': 'объект с текстовыми значениями',
    '{what} is not a valid HTTP header — Xray {tag} refuses the config.':
        '{what} — недопустимый HTTP-заголовок — Xray {tag} отвергает конфиг.',
    '{what} cannot be set: Xray {tag} manages that header itself and refuses the config.':
        '{what} задавать нельзя: этим заголовком Xray {tag} управляет сам и отвергает конфиг.',
    'Use the host field for the Host header.': 'Для заголовка Host используйте поле host.',
    '{what} cannot be set while user or pass is: they build the Authorization header, and Xray {tag} refuses the config when both are there.':
        '{what} нельзя задавать вместе с user или pass: из них собирается заголовок Authorization, и если есть и то и другое, Xray {tag} отвергает конфиг.',
    '{what} cannot contain a colon — it separates the user from the password in the sign-in, and Xray {tag} refuses the config.':
        'В {what} не может быть двоеточия — оно отделяет пользователя от пароля при входе, и Xray {tag} отвергает конфиг.',
    '{what} is empty — with warp set, Xray {tag} needs the address WARP gave this device, and refuses the config without one.':
        '{what} не задан — при заданном warp Xray {tag} нужен адрес, выданный этому устройству WARP, и без него конфиг отвергается.',
    'a list of text': 'список строк',
    '{what} lists "{value}", which is not an IP address or prefix — Xray {tag} refuses the config.':
        'В {what} указано «{value}», а это не IP-адрес и не префикс — Xray {tag} отвергает конфиг.',
    '{what} takes at most one IPv4 and one IPv6 address — Xray {tag} refuses a second of either.':
        '{what} принимает не больше одного адреса IPv4 и одного IPv6 — второй любого из них Xray {tag} отвергает.',
    'A masque outbound runs only over the masque transport: Xray {tag} refuses to start it on {network}.':
        'Outbound masque работает только на транспорте masque: на {network} Xray {tag} его не запускает.',
    'A masque inbound runs only over the masque transport: Xray {tag} refuses to start it on {network}.':
        'Inbound masque работает только на транспорте masque: на {network} Xray {tag} его не запускает.',
    'Set the network to masque.': 'Поставьте сеть masque.',
    'A masque outbound needs security tls: Xray {tag} refuses to start it without.':
        'Outbound masque требует security tls: без него Xray {tag} его не запускает.',
    'A masque inbound needs security tls: Xray {tag} refuses to start it without.':
        'Inbound masque требует security tls: без него Xray {tag} его не запускает.',
    'Set security to tls.': 'Поставьте security tls.',
    '{what} is not set — Xray {tag} refuses a masque outbound without a port.':
        '{what} не задан — outbound masque без порта Xray {tag} отвергает.',
    'a whole number from 1 to 65535': 'целое число от 1 до 65535',
    '{what} is not set — Xray {tag} refuses a masque outbound without a server address.':
        '{what} не задан — outbound masque без адреса сервера Xray {tag} отвергает.',
    '{what} lists "{value}", which is not an IP address — Xray {tag} refuses the config. Host names are not accepted there.':
        'В {what} указано «{value}», а это не IP-адрес — Xray {tag} отвергает конфиг. Имена хостов там не принимаются.',
    'A masque outbound cannot use Mux — Xray {tag} refuses the config.':
        'Outbound masque не может использовать Mux — Xray {tag} отвергает конфиг.',
    'Turn Mux off.': 'Выключите Mux.',
    '{what} is empty — every masque user needs an email, and Xray {tag} refuses the config without one.':
        '{what} не задан — каждому пользователю masque нужен email, без него Xray {tag} отвергает конфиг.',
    '{what} "{value}" contains a colon — Xray {tag} refuses it, because the colon separates the user from the password in the sign-in.':
        '{what} «{value}» содержит двоеточие — Xray {tag} его отвергает: двоеточие отделяет пользователя от пароля при входе.',
    '{what} is empty — Xray {tag} refuses a masque user without a password.':
        '{what} не задан — пользователя masque без пароля Xray {tag} отвергает.',
    '{what} "{value}" is used twice (case does not matter) — Xray {tag} refuses a duplicate user.':
        '{what} «{value}» встречается дважды (регистр не важен) — повторяющегося пользователя Xray {tag} отвергает.',
    '{what} is not set — a masque inbound hands out addresses from it, and Xray {tag} refuses the config without at least one prefix.':
        '{what} не задан — из него inbound masque раздаёт адреса, и без хотя бы одного префикса Xray {tag} отвергает конфиг.',
    'Add a prefix like 10.250.0.1/24: the server takes that address and clients get the rest.':
        'Добавьте префикс вроде 10.250.0.1/24: сервер берёт этот адрес, клиенты получают остальные.',
    '{what} lists "{value}", which is not an address prefix like 10.250.0.1/24 — Xray {tag} refuses the config.':
        'В {what} указано «{value}», а это не префикс адреса вида 10.250.0.1/24 — Xray {tag} отвергает конфиг.',
    '{what} takes at most one IPv4 and one IPv6 prefix — Xray {tag} refuses a second of either.':
        '{what} принимает не больше одного префикса IPv4 и одного IPv6 — второй любого из них Xray {tag} отвергает.',
    '{what} lists "{value}", which is the network\'s own address — the server takes the address it is given for itself, and Xray {tag} will not start with one that is not a host address.':
        'В {what} указано «{value}» — это адрес самой сети. Сервер забирает указанный адрес себе, а с адресом, который не является адресом хоста, Xray {tag} не запустится.',
    'Write the server\'s address inside the network, like 10.250.0.1/24.':
        'Укажите адрес сервера внутри сети, например 10.250.0.1/24.',
    '{what} lists "{value}", which leaves no address to give a client — Xray {tag} will not start.':
        'В {what} указано «{value}» — клиентам не остаётся ни одного адреса, Xray {tag} не запустится.',
    'Use a larger network, like a /24.': 'Возьмите сеть побольше, например /24.',
    'a whole number': 'целое число',
    '{what} is {value}; Xray {tag} takes 0 (the default) or 1280 to 65535.':
        '{what} — {value}; Xray {tag} принимает 0 (по умолчанию) или от 1280 до 65535.',
    'A masque inbound listens on an IP address, not on "{value}" — Xray {tag} fails to start it.':
        'Inbound masque слушает IP-адрес, а не «{value}» — Xray {tag} его не запустит.',
    'Leave listen empty to use every address.': 'Оставьте listen пустым, чтобы слушать все адреса.',
    'The masque transport can only be used by the masque outbound — Xray {tag} refuses the config.':
        'Транспорт masque может использовать только outbound masque — Xray {tag} отвергает конфиг.',
    'The masque transport can only be used by the masque inbound — Xray {tag} refuses the config.':
        'Транспорт masque может использовать только inbound masque — Xray {tag} отвергает конфиг.',
    'Pick another network, or change the protocol to masque.':
        'Выберите другую сеть или смените протокол на masque.',
    '{type} has to be the last UDP mask on Xray {tag}. Anywhere else the core stops with "{error}" when it sets the connection up.':
        'На Xray {tag} {type} должен быть последней UDP-маской. В любом другом месте ядро останавливается с «{error}» при установке соединения.',
    'xdns on Xray {tag} dials its own resolvers and never uses the socket, so a client skips every UDP mask listed after it while a server still applies them. Put xdns last in the list.':
        'На Xray {tag} xdns сам обращается к своим резолверам и не использует сокет, поэтому клиент пропускает все UDP-маски после него, а сервер их всё равно применяет. Поставьте xdns в конец списка.',
    'With no ips, xicmp on Xray {tag} pings the address this outbound dials, and refuses to dial at all when that is a domain ("empty ip addresses"). List the server\'s IP addresses in ips.':
        'Без ips xicmp на Xray {tag} пингует адрес, к которому подключается этот outbound, а если это домен — не подключается вовсе («empty ip addresses»). Перечислите IP-адреса сервера в ips.',
    'A noise item that sets both packet and rand is refused by Xray {tag} when the config loads. Keep one of them.':
        'Элемент шума, в котором заданы и packet, и rand, Xray {tag} отвергает при загрузке конфига. Оставьте что-то одно.',
    'The packet of a noise item of type exp has to be a string such as <b 0xDEADBEEF><r 8><t>; Xray {tag} refuses the config otherwise.':
        'packet у элемента шума типа exp должен быть строкой вида <b 0xDEADBEEF><r 8><t>; иначе Xray {tag} отвергает конфиг.',
    'Xray {tag} refuses this noise expression when the config loads: {problem}.':
        'Это выражение шума Xray {tag} отвергает при загрузке конфига: {problem}.',
    'xdns {key} on Xray {tag} must be a list of plain strings. Objects, or anything else, make Xray fail to read the config at all.':
        'На Xray {tag} xdns {key} должен быть списком простых строк. С объектами или чем-либо ещё Xray вообще не прочитает конфиг.',
    '{field} must be {expected} for Xray {tag}; as written the config does not load.':
        'Для Xray {tag} {field} должен быть {expected}; в таком виде конфиг не загрузится.',
    'xdns {key} on Xray {tag} must be a list of objects such as {example}. Plain strings, or anything else, make Xray fail to read the config at all.':
        'На Xray {tag} xdns {key} должен быть списком объектов вида {example}. С простыми строками или чем-либо ещё Xray вообще не прочитает конфиг.',
    'a list of whole numbers': 'список целых чисел',
    '{field} is {value}, outside {range}, so Xray {tag} refuses the config at load.':
        '{field} — {value}, вне диапазона {range}, поэтому Xray {tag} отвергает конфиг при загрузке.',
    '"{name}" is not a domain Xray {tag} accepts (it contains ".."), so the config does not load.':
        '«{name}» — не домен, который принимает Xray {tag} (в нём есть «..»), поэтому конфиг не загрузится.',
    '"{name}" does not fit xdns\'s limits (lenLimit {lenLimit}, labelLimit {labelLimit}): too little room is left for data, so Xray {tag} refuses the config at load.':
        '«{name}» не укладывается в ограничения xdns (lenLimit {lenLimit}, labelLimit {labelLimit}): для данных остаётся слишком мало места, поэтому Xray {tag} отвергает конфиг при загрузке.',
    'Record type {kind} is not one xdns can use (1 A, 5 CNAME, 16 TXT, 28 AAAA), so Xray {tag} stops when it builds the mask.':
        'Тип записи {kind} xdns использовать не может (1 A, 5 CNAME, 16 TXT, 28 AAAA), поэтому Xray {tag} останавливается при сборке маски.',
    'Resolver address "{value}" uses a scheme Xray {tag} refuses: only udp:// and tcp:// load ("invalid protocol").':
        'Адрес резолвера «{value}» использует схему, которую Xray {tag} отвергает: загружаются только udp:// и tcp:// («invalid protocol»).',
    'An xdns client builds its queries from its domains, and this one has none: every connection fails ("empty domains").':
        'Клиент xdns строит запросы из своих доменов, а у этого их нет: каждое соединение падает («empty domains»).',
    'udphop\'s interval starts at {from} seconds, and Xray {tag} refuses a start under 5 when it loads the config ("interval must be at least 5"). Leave it empty for the default of 30.':
        'Интервал udphop начинается с {from} с, а начало меньше 5 Xray {tag} отвергает при загрузке конфига («interval must be at least 5»). Оставьте пустым для значения по умолчанию 30.',
    'Read by the hysteria, MASQUE and XHTTP (HTTP/3) transports only. An empty field is left out of the config, so the core uses its default.':
        'Читают только транспорты hysteria, MASQUE и XHTTP (HTTP/3). Пустое поле в конфиг не пишется, и ядро берёт значение по умолчанию.',
    'Domains the tunnel runs under, as a JSON list of objects: names, and optionally lenLimit, labelLimit, types (1 A, 5 CNAME, 16 TXT, 28 AAAA) and edns0. Both the server and the client read it.':
        'Домены, под которыми работает туннель, — JSON-список объектов: names и по желанию lenLimit, labelLimit, types (1 A, 5 CNAME, 16 TXT, 28 AAAA) и edns0. Читают и сервер, и клиент.',
    'Resolvers the client queries through, as a JSON list of objects holding addrs: 1.1.1.1:53, or tcp://8.8.8.8. A bare address is UDP on port 53.':
        'Резолверы, через которые клиент делает запросы, — JSON-список объектов с addrs: 1.1.1.1:53 или tcp://8.8.8.8. Голый адрес — это UDP на порту 53.',
    'Extra empty polling queries sent after each packet and each poll, 0 to 3.':
        'Дополнительные пустые опрашивающие запросы после каждого пакета и каждого опроса, от 0 до 3.',
    'Seconds between hops: 10 or 5-30, at least 5. Empty means 30.':
        'Секунды между прыжками: 10 или 5-30, не меньше 5. Пусто — 30.',
    'The generator rebuilds the whole list from hex packets, so it stays off while a packet is an exp expression.':
        'Генератор пересобирает весь список из hex-пакетов, поэтому он недоступен, пока какой-то пакет — выражение exp.',
    'a list of strings': 'список строк',
    'a list of numbers or ranges': 'список чисел или диапазонов',
    'a list of objects': 'список объектов',
    'a list of noise items': 'список элементов шума',
    'a list': 'список',
    'an object': 'объект',
    '{field} holds {value}, but Xray {tag} reads {expected} here — it cannot read the config until this is replaced or removed.':
        'В {field} записано {value}, а Xray {tag} ждёт здесь {expected} — он не прочитает конфиг, пока это не заменить или не убрать.',
    'MASQUE Settings': 'Настройки MASQUE',
    'MASQUE carries IP packets inside an HTTP request. The TLS ALPN picks the carrier: h2 on its own runs it over HTTP/2 on TCP, anything else over HTTP/3 on QUIC (a server that lists both listens on both).':
        'MASQUE передаёт IP-пакеты внутри HTTP-запроса. Носитель выбирает ALPN в TLS: один h2 — HTTP/2 поверх TCP, всё остальное — HTTP/3 поверх QUIC (сервер, у которого указано и то и другое, слушает оба).',
    'The request path, starting with a slash. target and ipproto can be used as variables, in braces. Empty uses the well-known path, or / for WARP.':
        'Путь запроса, начиная с косой черты. target и ipproto можно использовать как переменные в фигурных скобках. Пусто — стандартный путь, или / для WARP.',
    'The authority of the request. Empty uses the TLS server name; with WARP it is cloudflareaccess.com.':
        'Authority запроса. Пусто — имя сервера из TLS; для WARP это cloudflareaccess.com.',
    'Sent as Basic credentials in the Authorization header. Cannot be combined with WARP, and cannot contain a colon.':
        'Передаётся как Basic-учётные данные в заголовке Authorization. Несовместимо с WARP и не может содержать двоеточие.',
    'Extra request headers, as an object of text values. Host and Capsule-Protocol are set by Xray and refused. User-Agent also takes chrome, firefox, safari, edge, curl or golang as shorthand.':
        'Дополнительные заголовки запроса — объект с текстовыми значениями. Host и Capsule-Protocol Xray задаёт сам и не принимает. Для User-Agent можно писать сокращения chrome, firefox, safari, edge, curl или golang.',
    'Connect to Cloudflare WARP': 'Подключаться к Cloudflare WARP',
    'Signs in to the WARP endpoint with the device\'s own key pair instead of a user name and password. It needs the private key, the public key the endpoint presents, and the address WARP gave this device.':
        'Вход на узел WARP по собственной паре ключей устройства вместо имени и пароля. Нужны приватный ключ, публичный ключ, который предъявляет узел, и адрес, выданный этому устройству WARP.',
    'Private key': 'Приватный ключ',
    'Public key': 'Публичный ключ',
    'Device addresses': 'Адреса устройства',
    'What WARP assigned this device: at most one IPv4 and one IPv6 address, bare or as a prefix.':
        'Что WARP выдал этому устройству: не больше одного адреса IPv4 и одного IPv6, просто адресом или префиксом.',
    'Registered with WARP: the server, TLS name and WARP keys are filled in.':
        'Зарегистрировано в WARP: сервер, имя TLS и ключи WARP заполнены.',
    'MASQUE carries IP packets inside an HTTP request, so on the wire it looks like ordinary web traffic. It uses the masque transport and nothing else, it needs TLS, and it is the one outbound the core refuses to multiplex.':
        'MASQUE передаёт IP-пакеты внутри HTTP-запроса, поэтому на проводе он выглядит как обычный веб-трафик. Он работает только на транспорте masque, требует TLS и это единственный outbound, который ядро отказывается мультиплексировать.',
    'Registering again makes a new WARP device with new keys and replaces the ones below.':
        'Повторная регистрация создаёт новое устройство WARP с новыми ключами и заменяет те, что ниже.',
    'To use Cloudflare WARP, register a device: it fills in Cloudflare\'s server, the TLS name and the WARP keys. The private key is made in this browser.':
        'Чтобы использовать Cloudflare WARP, зарегистрируйте устройство: заполнятся сервер Cloudflare, имя TLS и ключи WARP. Приватный ключ создаётся в этом браузере.',
    'Register a new WARP device': 'Зарегистрировать новое устройство WARP',
    'Register with WARP': 'Зарегистрировать в WARP',
    'Clients sign in with an email and a password, and are given an address from the pool below. The server keeps the first address of each prefix for itself. It listens on an IP address (every address when left empty) and needs the masque transport with TLS.':
        'Клиенты входят по email и паролю и получают адрес из пула ниже. Первый адрес каждого префикса сервер оставляет себе. Он слушает IP-адрес (все адреса, если не задано) и требует транспорт masque с TLS.',
    'Address pool': 'Пул адресов',
    'One IPv4 and/or one IPv6 prefix, with the server\'s own address in it, like 10.250.0.1/24. The network address itself, and for IPv4 the broadcast address, cannot be the server\'s.':
        'Один префикс IPv4 и/или один IPv6 с адресом самого сервера внутри, например 10.250.0.1/24. Адрес самой сети, а для IPv4 и широковещательный адрес, сервер занять не может.',
    'The tunnel\'s packet size: empty for the default (1280), otherwise 1280 to 65535.':
        'Размер пакета туннеля: пусто — по умолчанию (1280), иначе от 1280 до 65535.',
    'Users': 'Пользователи',
    'A masque proxy runs only on the masque transport — Xray {tag} refuses to start it on anything else.':
        'Прокси masque работает только на транспорте masque — на любом другом Xray {tag} его не запускает.',
    'The masque transport can only be used by a masque proxy — Xray {tag} refuses the config otherwise.':
        'Транспорт masque может использовать только прокси masque — иначе Xray {tag} отвергает конфиг.',
    'CONNECT-IP over HTTP/3 or HTTP/2 — only a masque proxy may use it':
        'CONNECT-IP поверх HTTP/3 или HTTP/2 — только для прокси masque',
    'MASQUE runs only with TLS — Xray {tag} refuses to start it without.':
        'MASQUE работает только с TLS — без него Xray {tag} его не запускает.',
    'Points the system\'s DNS at the TUN gateway. On Linux the core refuses the config unless a gateway is set.':
        'Направляет системный DNS на шлюз TUN. На Linux ядро отвергает конфиг, если шлюз не задан.',
    'Windows only. "dns" keeps DNS queries on the TUN and "misconfigtun" blocks an IP version no route of which leads there. It needs autoSystemRoutingTable, and "dns" needs dns.':
        'Только Windows. «dns» удерживает DNS-запросы в TUN, а «misconfigtun» блокирует версию IP, ни один маршрут которой туда не ведёт. Требует autoSystemRoutingTable, а «dns» — ещё и dns.',
    'Trust the system CA store': 'Доверять системному хранилищу УЦ',
    'From Xray 26.10 the certificates of a server are checked against a CA bundle built into Xray. Turn this on to use the operating system\'s store instead, which is where a private or corporate CA lives.':
        'С Xray 26.10 сертификаты сервера проверяются по набору УЦ, встроенному в Xray. Включите, чтобы вместо него использовать хранилище операционной системы — там живут частные и корпоративные УЦ.',
    'Previous release': 'Предыдущий релиз',
    'WARP Generator': 'Генератор WARP',
    '{what} has {count} entries, and Xray {tag} wants exactly one server — the config will not load.':
        'В {what} {count} записей, а Xray {tag} нужен ровно один сервер — конфиг не загрузится.',
    'Set address and port beside method and password, or list exactly one server. Several servers are several outbounds behind a balancer.':
        'Укажите address и port рядом с method и password или перечислите ровно один сервер. Несколько серверов — это несколько outbound за балансировщиком.',
    '{what} is missing, and Xray {tag} refuses a Shadowsocks server without an address — the config will not load.':
        '{what} не задан, а сервер Shadowsocks без адреса Xray {tag} отвергает — конфиг не загрузится.',
    '{what} is missing or 0, and Xray {tag} refuses a Shadowsocks server without a port — the config will not load.':
        '{what} не задан или равен 0, а сервер Shadowsocks без порта Xray {tag} отвергает — конфиг не загрузится.',
    '{what} lists {count} keys, and {method} takes one — Xray {tag} refuses the config.':
        'В {what} {count} ключей, а {method} принимает один — Xray {tag} отвергает конфиг.',
    'Keep one key, or use an AES method to join a master key and a user key with a colon.':
        'Оставьте один ключ или возьмите AES-метод, чтобы соединить мастер-ключ и ключ пользователя через двоеточие.',
    '{field}, key {n} of {count}': '{field}, ключ {n} из {count}',
    '{what} is empty, and an outbound has no default cipher: Xray {tag} reads it as an unknown cipher method — the config will not load.':
        '{what} не задан, а шифра по умолчанию у outbound нет: Xray {tag} считает это неизвестным методом шифрования — конфиг не загрузится.',
    '{what} is read by Xray {tag} only with a 2022 method, and {method} is not one — it does nothing here.':
        '{what} Xray {tag} читает только с методом 2022, а {method} к ним не относится — здесь это ни на что не влияет.',
    '{name} is not a protocol Xray knows — its loader stops at "unknown config id" and the config will not load. The 2022 ciphers are methods of shadowsocks.':
        '{name} — не протокол, известный Xray: загрузчик останавливается на «unknown config id», и конфиг не загрузится. Шифры 2022 — это методы shadowsocks.',
    'Set protocol to shadowsocks and keep the 2022 method.': 'Поставьте протокол shadowsocks и оставьте метод 2022.',
    'Choose a method': 'Выберите метод',
    'Use shadowsocks': 'Сделать shadowsocks',
    'UDP over TCP version': 'Версия UDP over TCP',
    'A folder on this machine that both ends can reach': 'Папка на этой машине, доступная обеим сторонам',
    'A Google Drive folder, signed in with an OAuth client': 'Папка Google Drive, вход через OAuth-клиент',
    'Any HTTP file API, described by a template': 'Любое файловое HTTP API, описанное шаблоном',
    'A folder path on this machine. Both ends have to see the same files, so it is a shared or synced folder; Xray creates it when it is missing.':
        'Путь к папке на этой машине. Обе стороны должны видеть одни и те же файлы, поэтому это общая или синхронизируемая папка; если её нет, Xray её создаст.',
    'The id of the Google Drive folder both ends use — the last part of the folder\'s address.':
        'Идентификатор папки Google Drive, которую используют обе стороны, — последняя часть адреса папки.',
    'Put into the template wherever it says {folder}.': 'Подставляется в шаблон везде, где написано {folder}.',
    'Where the files go; what it means depends on the service.':
        'Куда кладутся файлы; что это значит, зависит от сервиса.',
    'Segment size (bytes)': 'Размер сегмента (байт)',
    'Flush interval (ms)': 'Интервал сброса (мс)',
    'Poll interval (ms)': 'Интервал опроса (мс)',
    'Longest poll interval (ms)': 'Наибольший интервал опроса (мс)',
    'Fast polling window (ms)': 'Окно быстрого опроса (мс)',
    'Missing segment timeout (ms)': 'Ожидание пропавшего сегмента (мс)',
    'Session lifetime (s)': 'Время жизни сессии (с)',
    'Concurrent transfers': 'Одновременных передач',
    'The largest piece of a stream written as one file. 0 or empty is {fallback}; Xray uses at most {cap}.':
        'Самый большой кусок потока, записываемый одним файлом. 0 или пусто — {fallback}; Xray берёт не больше {cap}.',
    'How long data waits for more before a short piece is written anyway. 0 or empty is {fallback}.':
        'Сколько данные ждут добавки, прежде чем короткий кусок всё равно запишется. 0 или пусто — {fallback}.',
    'How often the store is looked at for the other side\'s files while traffic flows. 0 or empty is {fallback}.':
        'Как часто хранилище проверяется на файлы другой стороны, пока идёт трафик. 0 или пусто — {fallback}.',
    'The longest wait between looks once the line is quiet; never shorter than the poll interval. 0 or empty is {fallback}.':
        'Самая долгая пауза между проверками, когда канал затих; не короче интервала опроса. 0 или пусто — {fallback}.',
    'How long after the last traffic polling stays at its fastest. 0 or empty is {fallback}.':
        'Сколько после последнего трафика опрос остаётся самым частым. 0 или пусто — {fallback}.',
    'How long a missing piece is waited for while later ones have arrived, before the connection is given up. 0 or empty is {fallback}.':
        'Сколько ждать пропавший кусок, когда следующие уже пришли, прежде чем бросить соединение. 0 или пусто — {fallback}.',
    'How long the listening side keeps a session nobody picks up or uses before removing its files. 0 or empty is {fallback}.':
        'Сколько слушающая сторона хранит сессию, которую никто не подхватил и не использует, прежде чем удалить её файлы. 0 или пусто — {fallback}.',
    'How many files are written or read at once. 0 or empty is {fallback}; Xray uses at most {cap}.':
        'Сколько файлов пишется или читается одновременно. 0 или пусто — {fallback}; Xray берёт не больше {cap}.',
    'Client ID': 'Client ID',
    'Client secret': 'Client secret',
    'Refresh token': 'Refresh token',
    'xdrive Settings': 'Настройки xdrive',
    'xdrive carries a connection as files: each side writes what it sends into a shared store and polls the store for what the other side wrote. Both ends need the same store and the same settings.':
        'xdrive передаёт соединение файлами: каждая сторона пишет отправляемое в общее хранилище и опрашивает его в поисках того, что написала другая. Обеим сторонам нужны одно хранилище и одинаковые настройки.',
    'Service': 'Сервис',
    'Where the files are kept. Written exactly as listed: Xray compares the name as it is, case and space included.':
        'Где хранятся файлы. Пишется ровно как в списке: Xray сравнивает имя как есть, с регистром и пробелом.',
    'Pick a service': 'Выберите сервис',
    'Remote folder': 'Удалённая папка',
    'Secrets': 'Секреты',
    'Google Drive takes exactly three: the client ID, the client secret and the refresh token, in that order.':
        'Google Drive нужно ровно три: client ID, client secret и refresh token, именно в таком порядке.',
    'Each one is put into the template wherever it says {secret0}, {secret1} and so on, counting from 0.':
        'Каждый подставляется в шаблон там, где написано {secret0}, {secret1} и так далее, считая с 0.',
    'Add a secret': 'Добавить секрет',
    'The HTTP calls the store makes: put, get, list and delete, each with a method and a url, and list with a namesRegex whose first group is the file name. {folder}, {name}, {prefix} and {secret0}… are filled in; auth and retry are optional.':
        'HTTP-вызовы хранилища: put, get, list и delete, у каждого method и url, а у list ещё namesRegex, первая группа которого — имя файла. {folder}, {name}, {prefix} и {secret0}… подставляются; auth и retry необязательны.',
    'Polling and writing': 'Опрос и запись',
    'How often each side looks at the store and how it writes to it. Empty is Xray\'s default.':
        'Как часто каждая сторона смотрит в хранилище и как в него пишет. Пусто — значение Xray по умолчанию.',
    'Xray {tag} refuses the config.': 'Xray {tag} отвергает конфиг.',
    'The inbound does not start on Xray {tag}.': 'На Xray {tag} inbound не запускается.',
    'Every connection through this outbound fails on Xray {tag}.':
        'На Xray {tag} каждое соединение через этот outbound падает.',
    'true or false': 'true или false',
    '{what} holds {value}, which the template service cannot read as a template object.':
        'В {what} записано {value}, а сервис template не может прочитать это как объект шаблона.',
    '{what} holds {value}, but the template reads {expected} there.':
        'В {what} записано {value}, а шаблон ждёт там {expected}.',
    '{what} is empty, and the template needs a url for each of put, get, list and delete.':
        '{what} не задан, а шаблону нужен url для каждого из put, get, list и delete.',
    '{what} is empty, and the template reads the file names out of a list response with it.':
        '{what} не задан, а им шаблон вынимает имена файлов из ответа list.',
    '{what} has no capture group, and the template takes each file name from the first one.':
        'В {what} нет захватывающей группы, а имя каждого файла шаблон берёт из первой.',
    'Put the part that is the name in parentheses, like {example}.':
        'Возьмите часть, которая является именем, в скобки, например {example}.',
    '{what} is "{value}": the template knows none, static, oauth2 and basic.':
        '{what} — «{value}»: шаблон знает только none, static, oauth2 и basic.',
    'Every request to the drive fails on Xray {tag}, so nothing gets through.':
        'На Xray {tag} каждый запрос к хранилищу падает, и ничего не проходит.',
    'The xdrive transport has no xdriveSettings, so it has no service to use.':
        'У транспорта xdrive нет xdriveSettings, поэтому ему не через что работать.',
    'a whole number from 0 to 4294967295': 'целое число от 0 до 4294967295',
    '{what} is not set: the xdrive transport needs a service — local, Google Drive or template.':
        '{what} не задан: транспорту xdrive нужен сервис — local, Google Drive или template.',
    '{what} is "{value}": the services are local, Google Drive and template, written exactly so.':
        '{what} — «{value}»: сервисы — local, Google Drive и template, написанные именно так.',
    'Write it as "{service}".': 'Напишите «{service}».',
    '{what} holds {count} entries, and Google Drive takes exactly three: the client ID, the client secret and the refresh token, in that order.':
        'В {what} {count} записей, а Google Drive нужно ровно три: client ID, client secret и refresh token, именно в таком порядке.',
    '{what} is not set, and the template service is built from it.':
        '{what} не задан, а сервис template строится из него.',
    '{what} is empty, and the local service needs the folder its files go in.':
        '{what} не задан, а сервису local нужна папка для его файлов.',
    '{what} is empty, and Google Drive needs the id of the folder its files go in.':
        '{what} не задан, а Google Drive нужен идентификатор папки для файлов.',
    '{what} is empty, and Google Drive needs all three secrets.':
        '{what} не задан, а Google Drive нужны все три секрета.',
    'An exp noise item does not build — {error} — so Xray refuses it as well, and it was left out.':
        'Элемент шума exp не собирается — {error}, — Xray его тоже отвергает, поэтому он пропущен.',
    '{n} noise packet could not be decoded: its type is not hex, str, base64, array or exp, or the packet does not fit the type. It was left out.|{n} noise packets could not be decoded: each has a type that is not hex, str, base64, array or exp, or a packet that does not fit its type. They were left out.':
        '{n} пакет шума не удалось раскодировать: его тип не hex, str, base64, array или exp, либо пакет не подходит к типу. Он пропущен.|{n} пакета шума не удалось раскодировать: у каждого тип не hex, str, base64, array или exp, либо пакет не подходит к типу. Они пропущены.|{n} пакетов шума не удалось раскодировать: у каждого тип не hex, str, base64, array или exp, либо пакет не подходит к типу. Они пропущены.',
    '{n} exp noise item has a packet that is not a string, which Xray refuses, and it was left out.|{n} exp noise items have a packet that is not a string, which Xray refuses, and they were left out.':
        'У {n} элемента шума exp packet — не строка, Xray такое отвергает, поэтому он пропущен.|У {n} элементов шума exp packet — не строка, Xray такое отвергает, поэтому они пропущены.|У {n} элементов шума exp packet — не строка, Xray такое отвергает, поэтому они пропущены.',
    'HTTP attributes': 'HTTP-атрибуты',
    'Matches a sniffed HTTP request: :method, :path and, on the HTTP inbound, each request header by its lower-case name. Each value is a regular expression the attribute has to match, and every entry has to match. A pattern Go cannot compile stops Xray when it starts.':
        'Совпадает с распознанным HTTP-запросом: :method, :path и, на inbound HTTP, каждый заголовок запроса по имени в нижнем регистре. Каждое значение — регулярное выражение, которому должен соответствовать атрибут, и совпасть должны все записи. Шаблон, который Go не может скомпилировать, останавливает Xray при запуске.',
    'An exp noise item has <{key} {size}>, a length drawn between {min} and {max} for each packet; AmneziaWG\'s <{key}> takes one fixed length, so the item was left out.':
        'В элементе шума exp есть <{key} {size}> — длина, выбираемая от {min} до {max} для каждого пакета; <{key}> в AmneziaWG принимает одну фиксированную длину, поэтому элемент пропущен.',
    'An exp noise item has <c>, a counter Xray raises with every packet it sends; AmneziaWG has no such tag, so the item was left out.':
        'В элементе шума exp есть <c> — счётчик, который Xray увеличивает с каждым отправленным пакетом; в AmneziaWG такого тега нет, поэтому элемент пропущен.',
    '{what} is {value}, but Xray reads an object of attribute names to strings there. It cannot decode the rule, so the config will not load.':
        '{what} — {value}, а Xray ждёт там объект «имя атрибута → строка». Правило не раскодируется, и конфиг не загрузится.',
    '{what} gives "{name}" the value {value}, and attribute values are strings. Xray cannot decode the rule, so the config will not load.':
        'В {what} атрибуту «{name}» задано {value}, а значения атрибутов — строки. Xray не раскодирует правило, и конфиг не загрузится.',
    '{key} is set to {value}. Xray {tag} has no such WireGuard setting on either side, so it changes nothing.':
        'В {key} записано {value}. У Xray {tag} нет такой настройки WireGuard ни на одной стороне, поэтому она ни на что не влияет.',
    'This key takes a JSON object whose values are all strings, in quotes — the config keeps the last valid value.':
        'Этот ключ принимает JSON-объект, все значения которого — строки в кавычках; в конфиге остаётся последнее корректное значение.',
    'Carries traffic as files in a shared folder or on a cloud drive':
        'Передаёт трафик файлами в общей папке или на облачном диске',
    'Xray has no outbound called "{name}": its loader stops at "unknown config id" and the config will not load.':
        'В Xray нет outbound с именем «{name}»: загрузчик останавливается на «unknown config id», и конфиг не загрузится.',
    'This Shadowsocks outbound has no method, and a link has to name one. Choose the method first.':
        'У этого outbound Shadowsocks нет метода, а ссылка обязана его указать. Сначала выберите метод.',
    'An xdns domain on Xray {tag} needs its record types: with none the config does not load ("empty types").':
        'Домену xdns на Xray {tag} нужны типы записей: без них конфиг не загрузится («empty types»).',
    'Record type {kind} is not one xdns can use (1 A, 5 CNAME, 16 TXT, 28 AAAA), so Xray {tag} refuses the config at load.':
        'Тип записи {kind} xdns использовать не может (1 A, 5 CNAME, 16 TXT, 28 AAAA), поэтому Xray {tag} отвергает конфиг при загрузке.',
    'Resolver type "{value}" is not one Xray {tag} loads: only tcp and udp ("unknown config id").':
        'Тип резолвера «{value}» Xray {tag} не загружает: только tcp и udp («unknown config id»).',
    'A resolver needs its settings object, such as {example}; without it Xray {tag} fails to read the config ("unexpected end of JSON input").':
        'Резолверу нужен объект settings, например {example}; без него Xray {tag} не прочитает конфиг («unexpected end of JSON input»).',
    'An xdns client dials every resolver when it is set up, and a resolver with no addr fails that: every connection fails.':
        'Клиент xdns при настройке подключается к каждому резолверу, и резолвер без addr на этом падает: падает каждое соединение.',
    'Domains the tunnel runs under, as a JSON list of objects: name, types (at least one of 1 A, 5 CNAME, 16 TXT, 28 AAAA), and optionally lenLimit, labelLimit and edns0. Both the server and the client read it.':
        'Домены, под которыми работает туннель, — JSON-список объектов: name, types (хотя бы один из 1 A, 5 CNAME, 16 TXT, 28 AAAA) и по желанию lenLimit, labelLimit и edns0. Читают и сервер, и клиент.',
    'Resolvers the client queries through, as a JSON list of objects: type (udp or tcp) and settings holding addr, such as 1.1.1.1:53.':
        'Резолверы, через которые клиент делает запросы, — JSON-список объектов: type (udp или tcp) и settings с addr, например 1.1.1.1:53.',
    'Xray 26.9.30 dropped this setting; {tag} ignores it, so it does nothing here.':
        'В Xray 26.9.30 эту настройку убрали; {tag} её игнорирует, поэтому здесь она ни на что не влияет.',
    'Before MASQUE and xdrive': 'До MASQUE и xdrive',
    // ── Freedom: fragment, noises and the rest of its settings ──────────────
    'Domain Strategy (legacy key)': 'Стратегия доменов (старый ключ)',
    'TLS Fragmentation': 'Фрагментация TLS',
    'Cuts the outgoing stream into pieces so a filter cannot read the handshake in one go.':
        'Режет исходящий поток на куски, чтобы фильтр не прочитал рукопожатие целиком.',
    'Packets': 'Пакеты',
    'Length (bytes)': 'Длина (байт)',
    'Interval (ms)': 'Интервал (мс)',
    'Max Split': 'Максимум кусков',
    'Noise Packets': 'Шумовые пакеты',
    'Junk sent before the real traffic, to spoil a fingerprint taken from the first packet.':
        'Мусор, отправляемый перед настоящим трафиком, чтобы испортить отпечаток, снятый с первого пакета.',
    'Type': 'Тип',
    'Random bytes, packet is a length range': 'Случайные байты, в packet — диапазон длины',
    'The text as typed': 'Текст как есть',
    'Hex-decoded bytes': 'Байты из hex',
    'Base64-decoded bytes': 'Байты из base64',
    'Packet': 'Пакет',
    'Delay (ms)': 'Задержка (мс)',
    'Apply To': 'Применять к',
    'Any IP': 'Любой IP',
    'Extended Freedom Settings': 'Расширенные настройки Freedom',
    'Redirect, PROXY protocol and policy level.': 'Перенаправление, PROXY protocol и уровень политики.',
    'Redirect (addr:port)': 'Перенаправление (адрес:порт)',
    'PROXY Protocol': 'PROXY Protocol',
    'Announce the original client address to the destination.':
        'Сообщать адрес исходного клиента получателю.',
    'User Level': 'Уровень пользователя',

    // ── MASQUE ──────────────────────────────────────────────────────────────
    'MASQUE Server': 'Сервер MASQUE',
    'Resolvers reached through the tunnel. IP addresses only — the core parses each one at startup and will not run if a hostname is in the list.':
        'Резолверы, доступные через туннель. Только IP-адреса — ядро разбирает каждый при старте и не запустится, если в списке окажется имя хоста.',

    // ── Outbound shape: loopback, blackhole, proxy chaining ─────────────────
    'Loopback Settings': 'Настройки loopback',
    'Traffic sent here never leaves Xray. It re-enters routing carrying the inbound tag below, so a second set of rules can decide where it really goes — which is how one rule\'s result becomes another rule\'s input.':
        'Трафик, отправленный сюда, не покидает Xray. Он заново входит в маршрутизацию с указанным ниже тегом inbound, и второй набор правил решает, куда он пойдёт на самом деле — так результат одного правила становится входом для другого.',
    'Inbound Tag (re-entry point)': 'Тег inbound (точка возврата)',
    'Tag the traffic comes back in as...': 'Тег, с которым трафик вернётся…',
    'Routing rules matching this tag decide where the traffic goes on its second pass. A tag no rule matches means it falls through to the first outbound.':
        'Правила маршрутизации, совпавшие с этим тегом, решают судьбу трафика на втором проходе. Если тег не совпал ни с одним правилом, трафик уйдёт в первый outbound.',
    'Sniffing on re-entry': 'Sniffing при возврате',
    'Reads the destination out of the traffic itself, the same way an inbound does.':
        'Определяет назначение из самого трафика — так же, как это делает inbound.',
    'Route only (do not rewrite the destination)': 'Только маршрутизация (не переписывать назначение)',
    'Send bytes of your own': 'Отправить свои байты',
    'Custom Response (base64)': 'Свой ответ (base64)',
    'Base64 of the exact bytes to write back. Xray decodes it at startup and will not run if it is not valid base64.':
        'Base64 тех байтов, которые нужно отдать. Xray декодирует их при старте и не запустится, если это не корректный base64.',
    'Remove it': 'Убрать',

    'Copies a JSON array, which is what the scopes field wants when you create the token.':
        'Копируется JSON-массив — именно его ждёт поле scopes при создании токена.',
    'Copy read-only': 'Скопировать только чтение',
    'Read-only scopes copied': 'Scope только для чтения скопированы',
    'Copy all {count}': 'Скопировать все {count}',
    'Scopes copied': 'Scope скопированы',

    // ── Local balancer / template builder ───────────────────────────────────
    'Label — also the grouping key when splitting by location':
        'Метка — она же ключ группировки, когда конфиги делятся по локациям',
    'Nodes from': 'Узлы из',
    'Paste vless:// / vmess:// / ss:// links, a base64 subscription, or a JSON config…':
        'Вставьте ссылки vless:// / vmess:// / ss://, подписку в base64 или JSON-конфиг…',
    'Take the proxy outbounds from the config open in the editor':
        'Взять proxy-outbound’ы из конфига, открытого в редакторе',
    'From config': 'Из конфига',
    'Read settings from the open config': 'Прочитать настройки из открытого конфига',
    'Not connected to Remnawave — connect from the header first.':
        'Нет подключения к Remnawave — сначала подключитесь в шапке.',
    'Search hosts, profiles, addresses…': 'Поиск по хостам, профилям, адресам…',
    'select usable': 'выбрать подходящие',
    'clear': 'снять',
    'Edit this host: address, transport, inbound, template':
        'Изменить этот хост: адрес, транспорт, inbound, шаблон',
    'No nodes yet — paste links above and press Parse, or pull them in with From config.':
        'Узлов пока нет — вставьте ссылки выше и нажмите «Разобрать» или подтяните их кнопкой «Из конфига».',
    'One config per location': 'По одному конфигу на локацию',
    'Groups nodes by label, ignoring trailing numbering — a subscription of "… #1 / … #2" becomes one balanced config per place.':
        'Группирует узлы по метке, игнорируя нумерацию в конце: из подписки «… #1 / … #2» получится по одному балансируемому конфигу на каждое место.',
    'Balancer': 'Балансировщик',
    'Tag prefix': 'Префикс тега',
    'Also the selector': 'Он же селектор',
    'Balancer tag': 'Тег балансировщика',
    'Tag style': 'Стиль тегов',
    'Strategy': 'Стратегия',
    'Fallback': 'Fallback',
    'Max RTT': 'Макс. RTT',
    'Expected': 'Ожидается',
    'Probe': 'Проверка',
    'Kind': 'Тип',
    'Interval': 'Интервал',
    'Timeout': 'Таймаут',
    'Samples kept': 'Хранить замеров',
    'Probe URL': 'URL проверки',
    'Local listeners': 'Локальные прослушиватели',
    'SOCKS port': 'Порт SOCKS',
    'HTTP port': 'Порт HTTP',
    'Listen address': 'Адрес прослушивания',
    '127.0.0.1 keeps the proxy off your LAN': '127.0.0.1 не выпускает прокси в локальную сеть',
    'Sniffing (needed for domain rules)': 'Sniffing (нужен для правил по домену)',
    'Which hosts the panel injects': 'Какие хосты подставляет панель',
    'Pick hosts by': 'Выбирать хосты по',
    'Pattern': 'Шаблон',
    'Use panel selection': 'Использовать выбор из панели',
    'Take hosts from': 'Брать хосты из',
    'Step 1 · Save the template to the panel': 'Шаг 1 · Сохраните шаблон в панель',
    'Target': 'Цель',
    'Read this template back into the controls above, so it can be edited and saved':
        'Прочитать этот шаблон обратно в поля выше, чтобы его можно было изменить и сохранить',
    'Load this template into the builder': 'Загрузить этот шаблон в конструктор',
    'New template name': 'Имя нового шаблона',
    'Letters, digits, spaces, _ and -': 'Буквы, цифры, пробелы, _ и -',
    'Refresh templates': 'Обновить список шаблонов',
    'Step 2 · Publish it to subscribers': 'Шаг 2 · Опубликуйте его подписчикам',
    'The nodes become hidden hosts sharing one tag; a visible host with that same tag carries the template. Subscribers see the one entry and their client gets the balanced config.':
        'Узлы становятся скрытыми хостами с одним общим тегом, а видимый хост с тем же тегом несёт шаблон. Подписчик видит одну точку входа, а его клиент получает балансируемый конфиг.',
    'Shared tag for this location': 'Общий тег для этой локации',
    'Entry host — the one subscribers see': 'Точка входа — тот хост, который видят подписчики',
    'Remark': 'Название (remark)',
    'Address': 'Адрес',
    'Port': 'Порт',
    'Bind to inbound': 'Привязать к inbound',
    'Load panel hosts': 'Загрузить хосты из панели',
    'Create the visible host and attach this template to it':
        'Создать видимый хост и прикрепить к нему этот шаблон',
    'Create entry host with this template': 'Создать точку входа с этим шаблоном',
    'What stays off the tunnel': 'Что не идёт в туннель',
    'Your own domains': 'Ваши собственные домены',
    'BitTorrent direct': 'BitTorrent напрямую',
    'Matched by sniffing the protocol, not by domain.':
        'Определяется по протоколу через sniffing, а не по домену.',
    'Write a DNS block': 'Записать блок DNS',
    'Off means the client uses whatever DNS the system gives it.':
        'Если выключено, клиент берёт тот DNS, который даёт система.',
    'Upstream servers': 'Вышестоящие серверы',
    'Used for everything that is not in the bypass list above':
        'Используется для всего, что не попало в список обхода выше',
    'Resolved locally, but not routed direct': 'Резолвится локально, но идёт не напрямую',
    'Added to the DNS bypass entry only — the traffic still goes through the proxy':
        'Добавляется только в обход DNS — сам трафик по-прежнему идёт через прокси',
    'Add at least one node to see the config': 'Добавьте хотя бы один узел, чтобы увидеть конфиг',

    // Builder toasts
    'No proxy outbounds found in that input': 'В этих данных нет proxy-outbound’ов',
    'Paste links, a subscription or a JSON config first':
        'Сначала вставьте ссылки, подписку или JSON-конфиг',
    'Could not parse that input': 'Не удалось разобрать эти данные',
    'Enter the client UUID first': 'Сначала укажите UUID клиента',
    'Select at least one host': 'Выберите хотя бы один хост',
    'Config loaded into the editor': 'Конфиг загружен в редактор',
    'Select hosts in the panel list first': 'Сначала выберите хосты в списке панели',
    'Loaded with caveats': 'Загружено с оговорками',
    'That template has no JSON body yet': 'У этого шаблона пока нет JSON-тела',
    'Could not read that template': 'Не удалось прочитать этот шаблон',
    'That JSON is not a balancer template': 'Этот JSON — не шаблон балансировщика',
    'No config open in the editor': 'В редакторе не открыт ни один конфиг',
    'Loaded the open config into the builder': 'Открытый конфиг загружен в конструктор',
    'Could not read the open config': 'Не удалось прочитать открытый конфиг',
    'Name the new template, or pick an existing one to update':
        'Дайте имя новому шаблону или выберите существующий для обновления',
    'Enter the shared tag first': 'Сначала укажите общий тег',
    'Select the hosts that should form the pool': 'Выберите хосты, из которых соберётся пул',
    'Enter the pool tag — the entry host must share it with the nodes':
        'Укажите тег пула — точка входа должна иметь тот же тег, что и узлы',
    'Fill in the remark, address and port': 'Заполните название, адрес и порт',
    'Pick the inbound this host binds to': 'Выберите inbound, к которому привязан хост',
    'Save or pick the template first': 'Сначала сохраните или выберите шаблон',
    'That inbound has no config profile attached': 'К этому inbound не привязан профиль конфига',

    // ── Transport / stream settings ─────────────────────────────────────────
    'Stream Settings': 'Настройки потока',
    'Transport protocol used to deliver data.': 'Транспортный протокол, по которому идут данные.',
    'Security': 'Шифрование',
    'Encryption layer (TLS/Reality).': 'Слой шифрования (TLS/Reality).',
    'HTTP Upgrade Configuration': 'Настройки HTTP Upgrade',
    'Host': 'Host',
    'TCP (RAW) Settings': 'Настройки TCP (RAW)',
    'Header Type (Obfuscation)': 'Тип заголовка (обфускация)',
    'HTTP Request (Legacy Obfuscation)': 'HTTP-запрос (устаревшая обфускация)',
    'Path (e.g. /)': 'Путь (например, /)',
    'Host (e.g. bing.com)': 'Host (например, bing.com)',
    'WebSocket Settings': 'Настройки WebSocket',
    'Heartbeat Period (s)': 'Период heartbeat (с)',
    'gRPC Settings': 'Настройки gRPC',
    'Enable Multi Mode': 'Включить Multi Mode',
    'Permit Without Stream': 'Разрешить без потока',
    'Service Name': 'Имя сервиса',
    'Authority': 'Authority',
    'User Agent': 'User-Agent',
    'custom user agent': 'свой user-agent',
    'Idle Timeout': 'Таймаут простоя',
    'Health Check Timeout': 'Таймаут проверки состояния',
    'Initial Windows Size': 'Начальный размер окна',
    'mKCP Settings': 'Настройки mKCP',
    'Enable Congestion Control': 'Включить контроль перегрузки',
    'TTI (ms)': 'TTI (мс)',
    'Uplink Capacity (MB/s)': 'Пропускная способность вверх (МБ/с)',
    'Downlink Capacity (MB/s)': 'Пропускная способность вниз (МБ/с)',
    'Read Buffer Size (MB)': 'Размер буфера чтения (МБ)',
    'Write Buffer Size (MB)': 'Размер буфера записи (МБ)',
    'Reality: A TLS extension for mimicking popular websites to bypass firewalls.':
        'REALITY: расширение TLS, которое маскирует соединение под популярные сайты, обходя блокировки.',
    'Extended REALITY Settings': 'Расширенные настройки REALITY',
    'Post-quantum signature verification, master key logs, and server debug options.':
        'Постквантовая проверка подписи, логи мастер-ключей и отладочные опции сервера.',
    'Standard TLS Settings': 'Стандартные настройки TLS',
    'Certificates (Paths)': 'Сертификаты (пути)',
    'Certificate file path (e.g. /path/to/fullchain.crt)':
        'Путь к файлу сертификата (например, /path/to/fullchain.crt)',
    'Private key file path (e.g. /path/to/private.key)':
        'Путь к файлу приватного ключа (например, /path/to/private.key)',
    'Extended TLS Settings': 'Расширенные настройки TLS',
    'Cipher suites, session resumption, certificate pinning, and SSLKEYLOGFILE.':
        'Наборы шифров, возобновление сессий, пиннинг сертификатов и SSLKEYLOGFILE.',

    // ── Dashboard ───────────────────────────────────────────────────────────
    'snippet — expanded by the panel': 'сниппет — панель раскроет его сама',
    'Modules': 'Модули',
    'Core': 'Ядро',
    'Core Settings': 'Настройки ядра',
    'Topology': 'Топология',
    'Geo Viewer': 'Geo-просмотр',
    'Config Inspector': 'Инспектор конфигов',
    'Build a client config with a local balancer from a set of nodes':
        'Собрать клиентский конфиг с локальным балансировщиком из набора узлов',
    'Local Balancer': 'Локальный балансировщик',
    'Remnawave': 'Remnawave',
    'Edit the hosts in your panel: address, transport, inbound and template':
        'Редактировать хосты в вашей панели: адрес, транспорт, inbound и шаблон',
    'Subscription templates — opens the balancer builder in template mode, where they are edited as a form or as JSON':
        'Шаблоны подписки — открывает конструктор балансировщика в режиме шаблона, где их правят формой или JSON',
    'Templates': 'Шаблоны',
    'Uncommitted': 'Не закоммичено',
    'Instant Commit (Ctrl+S). Shift+click for custom message':
        'Быстрый коммит (Ctrl+S). Shift+клик — со своим сообщением',
    'Commit': 'Коммит',
    'Commit with custom message...': 'Коммит со своим сообщением...',
    'Revert working tree to HEAD (git reset --hard)':
        'Откатить рабочую копию до HEAD (git reset --hard)',
    'Reset': 'Сброс',
    'Clean (HEAD)': 'Чисто (HEAD)',
    'Full Configuration (Auto-saved)': 'Полный конфиг (сохраняется автоматически)',
    'View JSON': 'Смотреть JSON',
    'Add Inbound': 'Добавить inbound',
    'Routing': 'Маршрутизация',
    'Edit Routing': 'Изменить маршрутизацию',
    'Strategy:': 'Стратегия:',
    'snippet': 'сниппет',
    'body not loaded': 'тело не загружено',
    'Traffic will follow the first outbound.': 'Трафик пойдёт в первый outbound.',
    'Generate WARP Outbound': 'Сгенерировать WARP-outbound',
    'Batch Import/Export': 'Пакетный импорт/экспорт',
    'Raw JSON Mode': 'Режим сырого JSON',
    'Add Outbound': 'Добавить outbound',
    'Search Outbounds': 'Искать outbound’ы',
    'Toggle Multi-select Mode': 'Режим множественного выбора',
    'Batch': 'Пакетно',
    'Add New Outbound': 'Добавить новый outbound',
    'Filter IP, Tag, Protocol...': 'Фильтр по IP, тегу, протоколу...',
    'Clear search': 'Очистить поиск',
    'No outbounds match your search': 'Ни один outbound не подходит под поиск',
    'Edit DNS': 'Изменить DNS',
    'DNS not configured. Click Edit to initialize defaults.':
        'DNS не настроен. Нажмите «Изменить», чтобы создать значения по умолчанию.',
    'expands to {n} item|expands to {n} items':
        'раскрывается в {n} элемент|раскрывается в {n} элемента|раскрывается в {n} элементов',

    // ── Config inspector / harvester ────────────────────────────────────────
    'Config Harvester & Inspector': 'Сбор и разбор конфигов',
    'Configuration Harvester': 'Сборщик конфигов',
    'Paste raw proxy links (VLESS, VMess, SS, Trojan, WG), JSON configs, or fetch directly from a subscription URL.':
        'Вставьте прокси-ссылки (VLESS, VMess, SS, Trojan, WG) или JSON-конфиги либо загрузите всё прямо по ссылке подписки.',
    'Emulated Client:': 'Клиент, под который маскируемся:',
    'Remnawave Device & System Parameters': 'Параметры устройства и системы для Remnawave',
    'Auto-Detect': 'Определить автоматически',
    'New HWID': 'Новый HWID',
    'Device HWID (x-hwid):': 'HWID устройства (x-hwid):',
    'UUID or 10-64 char alphanumeric string': 'UUID или строка из 10–64 букв и цифр',
    'HWID copied to clipboard': 'HWID скопирован в буфер обмена',
    'Device OS (x-device-os):': 'ОС устройства (x-device-os):',
    'OS Version (x-ver-os):': 'Версия ОС (x-ver-os):',
    'Device Model (x-device-model):': 'Модель устройства (x-device-model):',
    'Tip:': 'Подсказка:',
    'If your subscription has a strict 1-device limit, copy your existing HWID and OS from your active client (e.g. Throne / v2rayTun) above to fetch your real proxy nodes.':
        'Если подписка жёстко ограничена одним устройством, скопируйте сюда HWID и ОС из своего активного клиента (например, Throne или v2rayTun) — иначе настоящие узлы не отдадутся.',
    'Source Payload (JSON / Links / Base64)': 'Исходные данные (JSON / ссылки / base64)',
    'Beautify JSON': 'Форматировать JSON',
    'Copied payload to clipboard': 'Данные скопированы в буфер обмена',
    'Clear Input': 'Очистить ввод',
    'Analyze All Components': 'Разобрать все компоненты',
    'Source Index': 'Список источников',
    '{n} object found|{n} objects found':
        'найден {n} объект|найдено {n} объекта|найдено {n} объектов',
    'Edit or view raw source input': 'Посмотреть или изменить исходный ввод',
    'Source': 'Источник',
    'Clear All': 'Очистить всё',
    'Copied analyzed source payload to clipboard':
        'Разобранные исходные данные скопированы в буфер обмена',
    'Copy raw response/input that was analyzed': 'Скопировать сырой ответ или ввод, который разбирался',
    'Copy Analyzed Response': 'Копировать разобранный ответ',
    'Harvest Selected Config': 'Забрать выбранный конфиг',
    'Inbound Harvester': 'Сбор inbound’ов',
    'PORT': 'ПОРТ',
    'Edit JSON': 'Править JSON',
    'Open GUI Editor': 'Открыть визуальный редактор',
    'Add to Config': 'Добавить в конфиг',
    'Outbound Harvester': 'Сбор outbound’ов',
    'Rules': 'Правила',
    'Steal to Top': 'Поднять наверх',
    'Balancers': 'Балансировщики',
    'STRATEGY:': 'СТРАТЕГИЯ:',
    'Import Balancer': 'Импортировать балансировщик',

    // ── Store messages ──────────────────────────────────────────────────────
    'Raw JSON edits were discarded': 'Правки в сыром JSON отброшены',
    'Connect to Remnawave first': 'Сначала подключитесь к Remnawave',
    'Failed to load hosts from the panel': 'Не удалось загрузить хосты из панели',
    'Failed to create the host': 'Не удалось создать хост',
    'Host saved': 'Хост сохранён',
    'Failed to save the host': 'Не удалось сохранить хост',
    'Host deleted': 'Хост удалён',
    'Failed to delete the host': 'Не удалось удалить хост',
    'Failed to load subscription templates': 'Не удалось загрузить шаблоны подписки',
    'Failed to load the template': 'Не удалось загрузить шаблон',
    'Failed to create the template': 'Не удалось создать шаблон',
    'Template saved to the panel': 'Шаблон сохранён в панель',
    'Failed to save the template': 'Не удалось сохранить шаблон',
    'Template deleted': 'Шаблон удалён',
    'Failed to delete the template': 'Не удалось удалить шаблон',
    'Remnawave connection closed': 'Подключение к Remnawave закрыто',
    'URL and Token are required': 'Нужны и URL, и токен',
    'Linked to Remnawave via Token': 'Подключено к Remnawave по токену',
    'Session expired': 'Сессия истекла',
    'Profile config loaded': 'Конфиг профиля загружен',
    'Failed to load profile from cloud': 'Не удалось загрузить профиль из облака',
    'Cannot save: No active cloud profile': 'Нельзя сохранить: нет активного облачного профиля',
    'Push Blocked!': 'Отправка заблокирована!',
    'Cloud Profile Updated!': 'Облачный профиль обновлён!',
    'Failed to push config to cloud': 'Не удалось отправить конфиг в облако',
    'Version history cleared': 'История версий очищена',
    'No duplicates found': 'Дубликатов не найдено',
    'Cannot delete the only profile': 'Нельзя удалить единственный профиль',
    'Profile deleted': 'Профиль удалён',
    'Local Profile Saved (with issues)': 'Локальный профиль сохранён (с замечаниями)',
    'Local Profile Saved!': 'Локальный профиль сохранён!',
    'Reverted changes to baseline': 'Изменения откачены к исходному состоянию',
    'Configuration loaded with validation warnings. Check console.':
        'Конфиг загружен с предупреждениями проверки. Посмотрите консоль.',
    'Invalid template name': 'Недопустимое имя шаблона',
    'Invalid template body': 'Недопустимое тело шаблона',
    'A template with this name already exists': 'Шаблон с таким именем уже есть',
    'Invalid snippet name': 'Недопустимое имя сниппета',
    'Invalid snippet body': 'Недопустимое тело сниппета',
    'Failed to save snippet to the panel': 'Не удалось сохранить сниппет в панель',
    'Failed to delete snippet': 'Не удалось удалить сниппет',
    'Failed to sync snippet': 'Не удалось синхронизировать сниппет',

    // ── Hosts editor ────────────────────────────────────────────────────────
    'Inbound': 'Inbound',
    'Delete host': 'Удалить хост',
    'Search remark, address, tag…': 'Поиск по названию, адресу, тегу…',
    'Show hidden hosts': 'Показывать скрытые хосты',
    'New host': 'Новый хост',
    '{n} host|{n} hosts': '{n} хост|{n} хоста|{n} хостов',
    '{n} selected': 'выбрано {n}',
    '{shown} of {total} hosts': '{shown} из {total} хостов',
    'Not connected to Remnawave — connect from the header to load hosts.':
        'Нет подключения к Remnawave — подключитесь в шапке, чтобы загрузить хосты.',
    'hidden': 'скрыт',
    'template': 'шаблон',
    'off': 'выкл',
    'Pick a host to edit it': 'Выберите хост, чтобы его изменить',
    'Everything a subscriber needs to connect lives here: address and port, the transport details, the inbound it serves, and the template it renders. No client UUID involved — that only matters when turning a host into a node in the balancer builder.':
        'Здесь собрано всё, что нужно подписчику для подключения: адрес и порт, настройки транспорта, inbound, который обслуживает хост, и шаблон, который он отдаёт. UUID клиента тут не нужен — он требуется только когда хост превращают в узел конструктора балансировщика.',
    'Back to the list': 'Назад к списку',
    'Unsaved changes': 'Несохранённые изменения',
    'Saved': 'Сохранено',
    'Identity': 'Что это за хост',
    'What the subscriber sees in their client': 'То, что подписчик видит в своём клиенте',
    'Tag': 'Тег',
    'Where it points': 'Куда он ведёт',
    'The config-profile inbound this host serves':
        'Inbound из профиля конфига, который обслуживает этот хост',
    'Xray JSON template': 'Шаблон Xray JSON',
    'Attach one and subscribers of this host get that whole config, balancer included':
        'Прикрепите шаблон — и подписчики этого хоста получат весь его конфиг целиком, вместе с балансировщиком',
    'Open the template editor': 'Открыть редактор шаблонов',
    'Transport': 'Транспорт',
    'Security layer': 'Слой шифрования',
    "empty = use the inbound's": 'пусто = взять из inbound',
    'Host header': 'Заголовок Host',
    'Used by xhttp, ws and httpupgrade; gRPC reads it as the service name':
        'Используется в xhttp, ws и httpupgrade; для gRPC это имя сервиса',
    'Fingerprint': 'Fingerprint',
    'Allow insecure TLS': 'Разрешить небезопасный TLS',
    'Visibility': 'Видимость',
    'Hidden from subscribers': 'Скрыт от подписчиков',
    'Hidden hosts are the pool a template injects — they never appear in a subscription on their own.':
        'Скрытые хосты — это пул, который подставляет шаблон. Сами по себе они в подписке не появляются.',
    'Disabled': 'Отключён',
    'Kept in the panel but served to nobody.': 'Остаётся в панели, но никому не отдаётся.',
    'Still needed: {fields}': 'Ещё нужно: {fields}',
    'Nothing changed': 'Ничего не изменилось',

    // ── XHTTP ───────────────────────────────────────────────────────────────
    'Download-Specific XHTTP Settings': 'Настройки XHTTP только для скачивания',
    'Override Host header. Priority: host > serverName > address.':
        'Переопределяет заголовок Host. Приоритет: host > serverName > address.',
    'Extra Settings (Headers, Padding, Performance)':
        'Дополнительно (заголовки, набивка, производительность)',
    'Header Padding': 'Набивка заголовков',
    'Range like "100-1000". Random bytes added to headers to mask length.':
        'Диапазон вида «100-1000». В заголовки добавляются случайные байты, чтобы скрыть их длину.',
    'Stream-Up Keep-Alive (s)': 'Keep-alive для stream-up (с)',
    'Server sends padding every N seconds to keep CF/CDN alive. e.g. "20-80".':
        'Сервер раз в N секунд отправляет набивку, чтобы CF/CDN не обрывал соединение. Например, «20-80».',
    'No gRPC Header': 'Без заголовка gRPC',
    'No SSE Header': 'Без заголовка SSE',
    'Packet-Up Mode Settings': 'Настройки режима packet-up',
    'Max POST Bytes': 'Макс. байт в POST',
    'Min Post Interval': 'Мин. интервал между POST',
    'Max Buffered Posts': 'Макс. POST в буфере',
    'XMUX Control (H2/H3 Multiplexing)': 'Управление XMUX (мультиплексирование H2/H3)',
    'Max Concurrency': 'Макс. параллельных запросов',
    'Concurrent requests per connection. e.g. "16-32".':
        'Сколько запросов идёт одновременно в одном соединении. Например, «16-32».',
    'Max Connections': 'Макс. соединений',
    'If set, opens new connection for each request until limit.':
        'Если задано, под каждый запрос открывается новое соединение — до этого предела.',
    'Reuse Times': 'Повторных использований',
    'How many times a connection can be reused.':
        'Сколько раз можно переиспользовать одно соединение.',
    'Max Request Times': 'Макс. запросов на соединение',
    'Nginx limit is 1000. Core default is "600-900".':
        'В nginx предел — 1000. По умолчанию в ядре «600-900».',
    'Max Reusable Secs': 'Макс. время жизни соединения (с)',
    'Nginx limit is 1h. Core default is "1800-3000".':
        'В nginx предел — 1 час. По умолчанию в ядре «1800-3000».',
    'Keep-Alive': 'Keep-alive',
    '0 for auto. -1 to disable.': '0 — автоматически, -1 — выключить.',
    'Download-Only Settings (Asymmetric Upload/Download)':
        'Настройки только для скачивания (асимметричные каналы)',
    'Download Address': 'Адрес для скачивания',
    'Download Port': 'Порт для скачивания',
    'Download Security': 'Шифрование для скачивания',
    'SNI (optional)': 'SNI (необязательно)',
    'Download Path (must match upload usually)':
        'Путь для скачивания (обычно должен совпадать с путём отправки)',
    'Note: You can further customize downloadSettings JSON for full asymmetric split.':
        'Для полностью асимметричной схемы downloadSettings можно дописать вручную в JSON.',

    // ── Sockopt ─────────────────────────────────────────────────────────────
    'Socket Options (Sockopt)': 'Параметры сокета (sockopt)',
    'ADD': 'ДОБАВИТЬ',
    'REMOVE': 'УБРАТЬ',
    'Mark (Routing)': 'Mark (для маршрутизации)',
    'Interface (Bind)': 'Интерфейс (bind)',
    'TProxy (Linux)': 'TProxy (Linux)',
    'Accept PROXY Protocol': 'Принимать PROXY protocol',
    'V6 Only (Bind ::)': 'Только IPv6 (bind ::)',
    'Forwards this outbound\'s traffic through another outbound (tag). Used to "wrap" protocols like WireGuard into obfuscation layers like Freedom+Finalmask.':
        'Пропускает трафик этого outbound через другой outbound по тегу. Так «оборачивают» WireGuard в слои обфускации вроде Freedom+Finalmask.',
    'Select outbound...': 'Выберите outbound...',
    'TCP Fast Open': 'TCP Fast Open',
    'TCP MPTCP': 'TCP MPTCP',
    'Extended Socket & Kernel Options': 'Расширенные параметры сокета и ядра',
    'Happy Eyeballs (RFC 8305 Dual-Stack), TCP window clamping, and penetrate.':
        'Happy Eyeballs (RFC 8305, двойной стек), ограничение TCP-окна и penetrate.',
    'Address Port Strategy': 'Стратегия адреса и порта',
    'Applies upload stream socket options to the downstream connection.':
        'Применяет параметры сокета восходящего потока к нисходящему соединению.',
    'Inherit socket options across streams': 'Наследовать параметры сокета между потоками',
    'Simultaneously attempts IPv4 and IPv6 connections and selects the fastest path.':
        'Пробует IPv4 и IPv6 одновременно и выбирает тот, который отвечает быстрее.',
    'Fast fallback between IPv4 & IPv6': 'Быстрое переключение между IPv4 и IPv6',
    'Try Delay (ms)': 'Задержка попытки (мс)',
    'Interleave': 'Чередование',
    'Max Concurrent Try': 'Макс. одновременных попыток',
    'Prioritize IPv6': 'Приоритет IPv6',
    'TCP Keep-Alive Idle': 'TCP keep-alive: простой',
    'TCP Keep-Alive Interval': 'TCP keep-alive: интервал',
    'TCP User Timeout': 'TCP user timeout',
    'TCP Max Segment (MTU)': 'Макс. TCP-сегмент (MTU)',
    'TCP Congestion': 'Контроль перегрузки TCP',
    'TCP Window Clamp': 'Ограничение TCP-окна',

    // ── Routing rule editor ─────────────────────────────────────────────────
    'Select a rule to configure routing logic':
        'Выберите правило, чтобы настроить логику маршрутизации',
    'Raw Rule JSON': 'JSON правила',
    'Auto-fix: add network: tcp,udp (proper catch-all)':
        'Исправить: добавить network: tcp,udp (правильное правило «на всё»)',
    'Style lint': 'Замечание по стилю',
    'Auto-fix: convert to lowercase': 'Исправить: привести к нижнему регистру',
    'Rule Alias / Name (ruleTag)': 'Название правила (ruleTag)',
    'e.g. Block Ads, Global Proxy...': 'например, Block Ads, Global Proxy...',
    'This name will be shown in UI and Xray logs when matched.':
        'Это имя будет видно в интерфейсе и в логах Xray при срабатывании.',
    'Traffic Destination': 'Куда идёт трафик',
    'Where to send traffic': 'Куда отправлять трафик',
    'Select Target...': 'Выберите цель...',
    'Custom tag...': 'Свой тег...',
    'Required — select or type a destination tag, otherwise Xray will crash.':
        'Обязательно: выберите или введите тег назначения, иначе Xray упадёт.',
    'Domains (GeoSite)': 'Домены (GeoSite)',
    'List of domains to match. Use geosite:google for predefined groups.':
        'Список доменов для сопоставления. Для готовых наборов используйте geosite:google.',
    'IPs (GeoIP & CIDR)': 'IP-адреса (GeoIP и CIDR)',
    'List of IP addresses or CIDR ranges. Use geoip:cn for country-based matching.':
        'Список IP-адресов или диапазонов CIDR. Для стран используйте geoip:cn.',
    'Advanced Matchers': 'Дополнительные условия',
    'Inbound Source': 'Источник (inbound)',
    'Filter traffic by the tag of the inbound connection.':
        'Фильтрует трафик по тегу входящего соединения.',
    'Network': 'Сеть',
    'Protocol': 'Протокол',
    'Extended Rule Settings & Webhooks': 'Расширенные настройки правила и вебхуки',
    'Custom HTTP attributes, rule tagging for metrics, and webhook dispatch.':
        'Свои HTTP-атрибуты, теги правил для метрик и отправка вебхуков.',
    'Custom identifier for this rule in stats and metrics.':
        'Свой идентификатор этого правила в статистике и метриках.',
    'Send HTTP POST notification on match.':
        'Отправлять HTTP POST при срабатывании.',
    '“{matcher}” is also used in {rule} (rule #{number})':
        '«{matcher}» используется ещё и в {rule} (правило №{number})',

    // ── Rule and balancer lists ─────────────────────────────────────────────
    '{n} rule will crash Xray — fix it before closing|{n} rules will crash Xray — fix them before closing':
        'из-за {n} правила Xray упадёт — исправьте перед закрытием|из-за {n} правил Xray упадёт — исправьте перед закрытием|из-за {n} правил Xray упадёт — исправьте перед закрытием',
    '{n} rule contains shadowed duplicate matchers|{n} rules contain shadowed duplicate matchers':
        'в {n} правиле есть перекрытые дубликаты условий|в {n} правилах есть перекрытые дубликаты условий|в {n} правилах есть перекрытые дубликаты условий',
    '{n} snippet reference expanded by the panel|{n} snippet references expanded by the panel':
        '{n} ссылка на сниппет раскрывается панелью|{n} ссылки на сниппеты раскрываются панелью|{n} ссылок на сниппеты раскрываются панелью',
    '{n} not loaded': '{n} не загружено',
    '{n} balancer|{n} balancers': '{n} балансировщик|{n} балансировщика|{n} балансировщиков',
    '{n} outbound|{n} outbounds': '{n} outbound|{n} outbound’а|{n} outbound’ов',
    '{n} entry|{n} entries': '{n} запись|{n} записи|{n} записей',
    '{n} domain|{n} domains': '{n} домен|{n} домена|{n} доменов',
    '{n} error|{n} errors': '{n} ошибка|{n} ошибки|{n} ошибок',
    '{n} config|{n} configs': '{n} конфиг|{n} конфига|{n} конфигов',
    'of {n} node|of {n} nodes': 'из {n} узла|из {n} узлов|из {n} узлов',
    'Currently {n} entry.|Currently {n} entries.':
        'Сейчас {n} запись.|Сейчас {n} записи.|Сейчас {n} записей.',
    'snippet · body not loaded': 'сниппет · тело не загружено',
    'Remove this snippet reference': 'Убрать эту ссылку на сниппет',
    'Empty selector!': 'Пустой селектор!',
    'No balancers found': 'Балансировщиков нет',
    'none!': 'нет!',
    'Delete Rule': 'Удалить правило',

    // ── Inbound clients ─────────────────────────────────────────────────────
    'Managed by Remnawave': 'Управляется Remnawave',
    'User management for this inbound is handled dynamically by your Remnawave panel. Manually adding clients here is not required.':
        'Пользователями этого inbound управляет панель Remnawave. Добавлять клиентов здесь вручную не нужно.',
    'Remnawave Active': 'Remnawave активен',
    'Method': 'Метод',
    'Encryption algorithm for Shadowsocks.': 'Алгоритм шифрования для Shadowsocks.',
    'Password / Pre-shared Key': 'Пароль / общий ключ',
    'Length:': 'Длина:',
    'Hysteria 2 Users': 'Пользователи Hysteria 2',
    'Password': 'Пароль',
    'Auth Type': 'Тип аутентификации',
    'UDP Support': 'Поддержка UDP',
    'Enable UDP associate for SOCKS5.': 'Включает UDP associate для SOCKS5.',
    'Allow Transparent': 'Разрешить прозрачный режим',
    'Allow transparent proxying for HTTP.': 'Разрешает прозрачное проксирование HTTP.',
    'Add Account': 'Добавить учётную запись',
    'Username': 'Имя пользователя',
    'Generate Password': 'Сгенерировать пароль',
    'Remove Account': 'Удалить учётную запись',
    'Clients / Users': 'Клиенты и пользователи',
    'Email': 'Email',
    'Flow': 'Flow',
    'No users defined. Click Add to create one.':
        'Пользователей нет. Нажмите «Добавить», чтобы создать.',

    // ── WireGuard / WARP ────────────────────────────────────────────────────
    'WARP account generated successfully': 'Аккаунт WARP создан',
    'Failed to generate WARP account': 'Не удалось создать аккаунт WARP',
    'WireGuard Settings': 'Настройки WireGuard',
    'Secret Key': 'Секретный ключ',
    'Private Key': 'Приватный ключ',
    'Local Address (CIDR)': 'Локальный адрес (CIDR)',
    'Maximum Transmission Unit. Default is 1280 for WARP.':
        'Maximum Transmission Unit. Для WARP по умолчанию 1280.',
    'Reserved (CSV)': 'Reserved (через запятую)',
    '[n,n,n] — header byte substitution. Use [0,0,0] for standard WARP.':
        '[n,n,n] — подмена байтов заголовка. Для обычного WARP используйте [0,0,0].',
    'No Kernel TUN': 'Без ядерного TUN',
    'Enabled: use gVisor (no root). Disabled: system (faster).':
        'Включено — gVisor (без root). Выключено — системный стек (быстрее).',
    'Peers': 'Пиры',
    'Add Peer': 'Добавить пир',
    'Endpoint': 'Endpoint',
    'Public Key': 'Публичный ключ',
    'Pre-shared Key': 'Общий ключ (PSK)',
    'Keep-alive (s)': 'Keep-alive (с)',
    'Allowed IPs': 'Разрешённые IP',
    'No peers added': 'Пиров нет',
    "How the peer's endpoint domain is resolved. WireGuard accepts only the Force variants; anything else stops the core from starting.":
        'Как резолвится домен эндпоинта пира. WireGuard принимает только варианты Force — на любом другом значении ядро не запустится.',
    'ForceIP (Default)': 'ForceIP (по умолчанию)',
    'Resolve the endpoint to any address': 'Резолвить эндпоинт в любой адрес',
    'IPv4 only': 'Только IPv4',
    'IPv6 only': 'Только IPv6',
    'IPv4 first, then IPv6': 'Сначала IPv4, потом IPv6',
    'IPv6 first, then IPv4': 'Сначала IPv6, потом IPv4',
    'Not accepted by Xray-core — the config will not start':
        'Xray-core не принимает это значение — конфиг не запустится',
    'Workers': 'Воркеры',
    'Number of concurrent workers. Default is CPU core count.':
        'Сколько воркеров работает параллельно. По умолчанию — по числу ядер.',
    'Remote DNS': 'Удалённый DNS',
    "DNS server(s) resolved through the WireGuard tunnel itself (not Xray's DNS module) — comma-separated. Useful when the peer's network only resolves internal names.":
        'DNS-серверы, которые резолвятся через сам туннель WireGuard, а не через DNS-модуль Xray; перечисляются через запятую. Нужно, когда сеть пира отдаёт только внутренние имена.',
    'Outbound profile generated successfully': 'Профиль outbound создан',
    'Generation failed': 'Не удалось сгенерировать',
    'This tool registers a new Cloudflare WARP account and generates a pre-configured WireGuard outbound profile.':
        'Инструмент регистрирует новый аккаунт Cloudflare WARP и собирает готовый outbound-профиль WireGuard.',
    'WARP Configuration Profile': 'Профиль настроек WARP',
    'Choose a profile based on your network. Profiles A-C use advanced obfuscation (AmneziaWG/Finalmask).':
        'Выберите профиль под свою сеть. Профили A–C используют продвинутую обфускацию (AmneziaWG/Finalmask).',
    'Exclude Local Traffic': 'Исключить локальный трафик',
    'Bypass local networks (192.168.x.x, etc.)':
        'Не заворачивать локальные сети (192.168.x.x и подобные)',

    // ── Snippets ────────────────────────────────────────────────────────────
    'Snippets & Templates': 'Сниппеты и шаблоны',
    'Search snippets...': 'Поиск сниппетов...',
    'Not connected to Remnawave. These are the last cached copies, and saving to the panel is disabled until you connect.':
        'Нет подключения к Remnawave. Это последние сохранённые копии; сохранять в панель нельзя, пока не подключитесь.',
    'This panel has no snippets API. Local templates still work.':
        'В этой панели нет API сниппетов. Локальные шаблоны при этом работают.',
    'Referenced by this config, body not found':
        'На него ссылается этот конфиг, но тело не найдено',
    'Select a snippet, or create one': 'Выберите сниппет или создайте новый',
    'A snippet is a reusable array of routing rules or outbounds. Remnawave expands the reference into its body before a node ever sees the config.':
        'Сниппет — это переиспользуемый массив правил маршрутизации или outbound’ов. Remnawave подставляет вместо ссылки её содержимое ещё до того, как конфиг попадёт на ноду.',
    'Back to the library list': 'Назад к списку',
    'Unsaved draft': 'Несохранённый черновик',
    'Name': 'Имя',
    'Letters, digits, spaces, _ - and / (folders)':
        'Буквы, цифры, пробелы, _, - и / (папки)',
    'Note (local only)': 'Заметка (только локально)',
    'What this template is for': 'Для чего нужен этот шаблон',
    'Body — a JSON array of rules or outbounds':
        'Тело — JSON-массив правил или outbound’ов',
    'Copy to local': 'Скопировать локально',
    'Re-apply this snippet to every profile that references it (restarts affected nodes)':
        'Применить сниппет заново ко всем профилям, которые на него ссылаются (затронутые ноды перезапустятся)',
    'Create or update this snippet in Remnawave':
        'Создать или обновить этот сниппет в Remnawave',
    'Push to panel': 'Отправить в панель',
    'Overwrites the body above with the plain rules from the open config':
        'Перезапишет тело выше обычными правилами из открытого конфига',
    'Replace body with config rules': 'Заменить тело правилами из конфига',
    'Insert into the open config': 'Вставить в открытый конфиг',
    'Insert reference': 'Вставить ссылку',
    'Insert a detached copy': 'Вставить отдельную копию',
    'A reference stays managed by the panel. A detached copy is a one-off: later changes to the snippet will not reach this config.':
        'Ссылкой продолжает управлять панель. Отдельная копия живёт сама по себе: дальнейшие изменения сниппета в этот конфиг уже не попадут.',
    'Invalid JSON Syntax': 'Ошибка синтаксиса JSON',
    'This config has no plain rules to capture': 'В этом конфиге нет обычных правил для захвата',
    'Save the draft first, then insert a copy of it':
        'Сначала сохраните черновик, потом вставляйте его копию',
    'Snippet reference. Remnawave replaces it with the snippet body before the config reaches a node, so there is nothing to configure here.':
        'Ссылка на сниппет. Remnawave подставит вместо неё тело сниппета до того, как конфиг дойдёт до ноды, так что настраивать тут нечего.',
    'Body not loaded. Open the snippet library and refresh to fetch it from the panel.':
        'Тело не загружено. Откройте библиотеку сниппетов и обновите её, чтобы получить его из панели.',
    'Referenced snippet': 'Сниппет по ссылке',
    'Snippet name': 'Имя сниппета',
    'Snippet body (read-only)': 'Тело сниппета (только чтение)',
    'Edit this body in the snippet library — it is shared by every profile that references it.':
        'Правьте это тело в библиотеке сниппетов — оно общее для всех профилей, которые на него ссылаются.',
    'Open snippet library': 'Открыть библиотеку сниппетов',
    'Inline a copy': 'Вставить копию на место ссылки',
    'The reference is replaced by a copy of its contents. Later changes to the panel snippet will no longer reach this profile.':
        'Ссылка заменится копией её содержимого. Дальнейшие изменения сниппета в панели до этого профиля уже не дойдут.',

    // ── Top navigation ──────────────────────────────────────────────────────
    'Cloud Linked': 'Облако подключено',
    'Local Mode': 'Локальный режим',
    'Profiles & Editor Settings': 'Профили и настройки редактора',
    'Profiles': 'Профили',
    'Git Version History & Log': 'История версий и журнал Git',
    'Git Log': 'Журнал Git',
    'Clear Config': 'Очистить конфиг',
    'Switch Profile': 'Сменить профиль',
    'Connect Cloud': 'Подключить облако',
    'Profile & Tools Menu': 'Меню профиля и инструментов',
    'Load JSON': 'Загрузить JSON',
    'Download': 'Скачать',
    'Support Developer (Boosty)': 'Поддержать разработчика (Boosty)',
    'Support': 'Поддержать',
    'Official Xray Documentation': 'Официальная документация Xray',
    'About / Repository': 'О программе / репозиторий',
    'Profiles & Tools': 'Профили и инструменты',
    'Mobile Management Menu': 'Мобильное меню управления',
    'Select Active Profile': 'Выберите активный профиль',
    'Cloud Connection': 'Подключение к облаку',
    'Connect Remnawave Cloud': 'Подключить облако Remnawave',
    'Docs': 'Документация',
    'Repository': 'Репозиторий',
    'Support Dev': 'Поддержать разработчика',
    "What's New (Changelog)": 'Что нового (changelog)',
    'Loading commits...': 'Загружаем коммиты...',

    // ── Batch import / subscriptions ────────────────────────────────────────
    'Please enter a subscription URL': 'Укажите ссылку на подписку',
    'Panel rejected this device (HWID)': 'Панель отклонила это устройство (HWID)',
    'Subscription fetched successfully': 'Подписка загружена',
    'JSON subscription fetched (Raw)': 'JSON-подписка загружена (как есть)',
    'JSON detected but no valid outbounds found inside':
        'JSON распознан, но подходящих outbound’ов внутри нет',
    'No valid links or configuration found in response':
        'В ответе нет подходящих ссылок или конфигурации',
    'Fetch failed': 'Не удалось загрузить',
    'New HWID generated and saved': 'Новый HWID создан и сохранён',
    'Batch Operations': 'Пакетные операции',
    'Subscription URL...': 'Ссылка на подписку...',
    'Reset Device ID': 'Сбросить ID устройства',
    'User-Agent (Fake Client)': 'User-Agent (подставной клиент)',
    'X-HW-ID (Persistent)': 'X-HW-ID (постоянный)',
    'Nodes will appear here after Fetching or Paste manual links...':
        'Узлы появятся здесь после загрузки — или вставьте ссылки вручную...',
    'No valid links or JSON configs found to import':
        'Нет подходящих ссылок или JSON-конфигов для импорта',
    'Save To Config': 'Сохранить в конфиг',

    // ── Geo viewer ──────────────────────────────────────────────────────────
    'Copy raw text': 'Копировать как текст',
    'Close panel': 'Закрыть панель',
    'Extracting...': 'Извлекаем...',
    'Failed to copy data': 'Не удалось скопировать данные',
    'Geo Data Viewer': 'Просмотр geo-данных',
    'GeoSite': 'GeoSite',
    'GeoIP': 'GeoIP',
    'Custom Source': 'Свой источник',
    'Quick Presets:': 'Быстрые наборы:',
    'Paste URL or select local file...': 'Вставьте ссылку или выберите локальный файл...',
    'Upload Local File': 'Загрузить файл',
    'Search inside domains/IPs instead of category names':
        'Искать внутри доменов и IP, а не по названиям категорий',
    'Deep Search': 'Глубокий поиск',
    'Copy All': 'Копировать всё',
    'Validating Database...': 'Проверяем базу...',
    'Deep search error': 'Ошибка глубокого поиска',
    'Failed to parse DAT': 'Не удалось разобрать DAT',
    'File read error': 'Ошибка чтения файла',
    'Local file already loaded': 'Локальный файл уже загружен',
    'Please enter a valid URL': 'Введите корректную ссылку',
    'Failed to fetch list': 'Не удалось загрузить список',
    'Copy Raw Text': 'Копировать как текст',
    'Extracting records...': 'Извлекаем записи...',
    'Failed to download database for extraction': 'Не удалось скачать базу для извлечения',
    'Failed to load details': 'Не удалось загрузить подробности',

    // ── Reverse proxy ───────────────────────────────────────────────────────
    'Reverse Proxy (JSON)': 'Reverse-прокси (JSON)',
    'This editor edits the reverse root section directly.':
        'Этот редактор правит корневую секцию reverse напрямую.',
    'Reverse Proxy Configuration': 'Настройка reverse-прокси',
    'Domain': 'Домен',
    'Reverse Proxy': 'Reverse-прокси',
    'Bridges': 'Мосты (bridges)',
    'Portals': 'Порталы (portals)',
    'Internal Logic': 'Как это работает',
    'Bridge:': 'Bridge:',
    'The active end (behind NAT). Initiates connection to the Portal.':
        'Активная сторона (за NAT). Сама устанавливает соединение с порталом.',
    'Portal:': 'Portal:',
    'The passive end (public server). Listens for and accepts Bridge connections.':
        'Пассивная сторона (публичный сервер). Слушает и принимает соединения от мостов.',
    'Traffic flow: User → Portal (Passive) ↔ Bridge (Active) → Target Service.':
        'Путь трафика: пользователь → портал (пассивный) ↔ мост (активный) → целевой сервис.',

    // ── Editor settings / profiles / history ────────────────────────────────
    'Please enter a profile name': 'Введите имя профиля',
    'Config Profiles (Local Storage)': 'Профили конфигов (локально)',
    'New profile name...': 'Имя нового профиля...',
    'ACTIVE CLOUD': 'АКТИВНОЕ ОБЛАКО',
    'Switch to Local': 'Перейти в локальный режим',
    'Local Version History (Git-like Snapshots)':
        'Локальная история версий (снимки в стиле git)',
    'History Depth (Max Snapshots)': 'Глубина истории (макс. снимков)',
    'Number of rollback snapshots saved locally in browser memory (10 – 1000).':
        'Сколько снимков для откатов хранится локально в памяти браузера (от 10 до 1000).',
    'Quick:': 'Быстро:',
    'Large history (≥100 snapshots) may use significant browser memory.':
        'Большая история (от 100 снимков) может заметно занять память браузера.',
    'Auto-Save Profile on Edit': 'Автосохранение профиля при правках',
    'Automatically update active local profile when changes are made.':
        'Автоматически обновлять активный локальный профиль при изменениях.',
    'snapshots stored.': 'снимков сохранено.',
    'Open History Timeline': 'Открыть историю',
    'Clear History': 'Очистить историю',
    'Editor Settings & Profiles': 'Настройки редактора и профили',
    'Snapshots': 'Снимки',
    'Edits and saves will automatically create rollback points.':
        'Правки и сохранения сами создают точки для отката.',
    'Restore This Version': 'Восстановить эту версию',
    'Snapshot JSON Preview': 'Просмотр JSON снимка',
    'Select a history snapshot from the left timeline to preview and restore':
        'Выберите снимок в истории слева, чтобы посмотреть его и восстановить',

    // ── Finalmask ───────────────────────────────────────────────────────────
    'Finalmask Configuration': 'Настройка Finalmask',
    '{net} obfuscation chain': 'Цепочка обфускации {net}',
    'Add Layer': 'Добавить слой',
    'No {net} obfuscation layers.': 'Слоёв обфускации {net} нет.',
    'Layer {n}': 'Слой {n}',
    'Layer Type': 'Тип слоя',
    'Delay': 'Задержка',
    'Handshake Timeout': 'Таймаут рукопожатия',

    // ── Outbound protocols ──────────────────────────────────────────────────
    'Blackhole Settings': 'Настройки Blackhole',
    'The Blackhole outbound drops all outgoing traffic. Route specific domains or IPs here to block them — for ad-blocking, or to stop telemetry.':
        'Outbound Blackhole отбрасывает весь исходящий трафик. Направляйте сюда домены или IP, которые надо заблокировать: рекламу, телеметрию и прочее.',
    'Response Type': 'Тип ответа',
    'Determines what the client receives when traffic is blocked.':
        'Определяет, что получит клиент, когда трафик заблокирован.',
    'DNS Outbound': 'Outbound DNS',
    "The DNS outbound intercepts and forwards DNS queries. A query routed here is handled by Xray's own DNS logic.":
        'Outbound DNS перехватывает и пересылает DNS-запросы. Запрос, попавший сюда, обрабатывается собственной DNS-логикой Xray.',
    'DNS Server Address': 'Адрес DNS-сервера',
    'Freedom (Direct)': 'Freedom (напрямую)',
    'The Freedom outbound sends traffic straight to its destination with no proxy. Used for local traffic, or to keep something out of the tunnel.':
        'Outbound Freedom отправляет трафик прямо в пункт назначения, без прокси. Нужен для локального трафика или чтобы что-то не заворачивать в туннель.',
    'Domain Strategy': 'Стратегия для доменов',
    'Server Details': 'Данные сервера',
    'Address (IP or Domain)': 'Адрес (IP или домен)',
    'UDP over TCP (UOT)': 'UDP поверх TCP (UOT)',
    'Outbound Protocol': 'Протокол outbound',
    'Link imported successfully': 'Ссылка импортирована',
    'JSON configuration imported': 'JSON-конфигурация импортирована',
    'Only Obfuscator (Freedom) imported': 'Импортирован только обфускатор (Freedom)',
    'Unrecognized import format': 'Неизвестный формат импорта',
    'Direct': 'Напрямую',
    'Chained': 'Цепочкой',
    'AmneziaWG Detected': 'Обнаружен AmneziaWG',
    'Paste vless://... or [Interface]... config here':
        'Вставьте сюда vless://... или конфиг вида [Interface]...',
    'Modern (Direct)': 'Современный (напрямую)',
    'Legacy (Chained)': 'Устаревший (цепочкой)',
    'Obfuscator Only': 'Только обфускатор',
    'Import & Parse': 'Импортировать и разобрать',
    'Proxy Chaining (Optional)': 'Цепочка прокси (необязательно)',
    'Mux (Multiplexing)': 'Mux (мультиплексирование)',
    'TCP Concurrency': 'Параллельность TCP',
    'XUDP Concurrency': 'Параллельность XUDP',
    'UDP 443 Strategy (QUIC)': 'Стратегия для UDP 443 (QUIC)',
    'Enable to reduce handshake latency.': 'Включите, чтобы сократить задержку рукопожатия.',
    'Extended Outbound Settings': 'Расширенные настройки outbound',
    'Target domain resolution strategy and advanced proxy routing.':
        'Стратегия разрешения целевого домена и продвинутая маршрутизация через прокси.',
    'Target Domain Strategy (targetStrategy)': 'Стратегия целевого домена (targetStrategy)',
    'Resolution behavior when connecting to target domain via this outbound.':
        'Как разрешается имя при подключении к целевому домену через этот outbound.',
    'Outbound Editor': 'Редактор outbound',
    'Configuration imported successfully': 'Конфигурация импортирована',
    'Error generating link': 'Не удалось сгенерировать ссылку',
    'Copy Link': 'Копировать ссылку',
    "Remnawave replaces this entry with the snippet's outbounds before the config reaches a node. Edit the body in Snippets — filling in the fields below would turn the reference into an ordinary outbound.":
        'Remnawave заменит эту запись на outbound’ы из сниппета до того, как конфиг попадёт на ноду. Правьте тело в разделе «Сниппеты» — если заполнить поля ниже, ссылка превратится в обычный outbound.',

    // ── Topology ────────────────────────────────────────────────────────────
    'Traffic Topology': 'Топология трафика',
    'Hide Unused': 'Скрыть неиспользуемые',
    'Nodes: {n}': 'Узлов: {n}',
    'Toggle Map Layers': 'Слои схемы',
    'Click to toggle Inbound Portals': 'Нажмите, чтобы показать или скрыть inbound’ы',
    'Inbound Portals': 'Inbound’ы',
    'Click to toggle Routing Rules': 'Нажмите, чтобы показать или скрыть правила маршрутизации',
    'Routing Rules': 'Правила маршрутизации',
    'Click to toggle Load Balancers': 'Нажмите, чтобы показать или скрыть балансировщики',
    'Load Balancers': 'Балансировщики',
    'Click to toggle Outbound Nodes': 'Нажмите, чтобы показать или скрыть outbound’ы',
    'Outbound Nodes': 'Outbound’ы',

    // ── Builder extras ──────────────────────────────────────────────────────
    "Read the open config's balancer, probe and bypass settings back into the controls":
        'Прочитать из открытого конфига настройки балансировщика, проверок и обхода обратно в поля',
    "Also send traffic through the entry host's own address":
        'Пускать трафик ещё и через собственный адрес точки входа',
    'Any Xray matcher works here — domain:, regexp: or a geosite: category, which stays current without this app shipping a list of its own.':
        'Здесь работает любой матчер Xray — domain:, regexp: или категория geosite:, которая остаётся актуальной и не требует, чтобы приложение везло список с собой.',

    // ── DNS ─────────────────────────────────────────────────────────────────
    'DNS & FakeDNS (JSON)': 'DNS и FakeDNS (JSON)',
    'Form Mode': 'Режим формы',
    'This editor manages the dns and fakedns root sections at the same time.':
        'Этот редактор правит корневые секции dns и fakedns одновременно.',
    'Combined Configuration': 'Совмещённая конфигурация',
    'DNS Configuration': 'Настройка DNS',
    'General': 'Общее',
    'Servers': 'Серверы',
    'Hosts': 'Хосты',
    'FakeDNS': 'FakeDNS',
    'Back to Servers': 'Назад к серверам',
    'Simple DNS Server': 'Простой DNS-сервер',
    'Need domains filtering or specific IPs?': 'Нужен фильтр по доменам или конкретные IP?',
    'Convert to Advanced Object': 'Превратить в расширенный объект',
    'Advanced Server Config': 'Расширенная настройка сервера',
    'Domains (Routing)': 'Домены (маршрутизация)',
    'Expect IPs (Optional)': 'Ожидаемые IP (необязательно)',
    'Skip Fallback': 'Без fallback',
    'DNS Servers Priority List': 'Список DNS-серверов по приоритету',
    'No DNS servers defined.': 'DNS-серверы не заданы.',
    'DNS Static Mapping': 'Статические записи DNS',
    'Map domains to specific IP addresses.': 'Привязка доменов к конкретным IP-адресам.',
    'Add Host': 'Добавить хост',
    'IP Addresses': 'IP-адреса',
    'No static hosts configured.': 'Статических записей нет.',
    'FakeDNS Pools': 'Пулы FakeDNS',
    'Virtual IP ranges for domains': 'Виртуальные диапазоны IP для доменов',
    'Add Pool': 'Добавить пул',
    'No FakeDNS pools configured.': 'Пулов FakeDNS нет.',
    'Add one if you use TProxy or want to hide DNS results.':
        'Добавьте пул, если используете TProxy или хотите скрыть результаты DNS.',
    'Extended DNS Cache & Fallback Settings':
        'Расширенные настройки кэша DNS и fallback',
    'Stale cache serving, fallback strategies, and TTL expiration tuning.':
        'Отдача устаревшего кэша, стратегии fallback и настройка истечения TTL.',

    // ── Balancer editor ─────────────────────────────────────────────────────
    'Select a balancer to configure': 'Выберите балансировщик для настройки',
    'Raw Balancer JSON': 'JSON балансировщика',
    'Delete Balancer': 'Удалить балансировщик',
    'Critical Config Error': 'Критическая ошибка конфига',
    'Target Outbounds': 'Целевые outbound’ы',
    "Select individual nodes or add prefix filters (e.g. 'us-', 'sg-') to balance traffic across matching outbounds.":
        'Выберите отдельные узлы или добавьте фильтры по префиксу (например, «us-», «sg-»), чтобы балансировать трафик по подходящим outbound’ам.',
    'Observatory Required:': 'Нужен Observatory:',
    'The “{strategy}” strategy needs Observatory configured in Core Settings.':
        'Стратегия «{strategy}» работает только если Observatory настроен в настройках ядра.',
    'LeastLoad Settings': 'Настройки LeastLoad',
    'Observatory': 'Observatory',
    'Burst Observatory': 'Burst Observatory',
    'Health checks for Load Balancers': 'Проверки состояния для балансировщиков',
    "Select outbound tags or enter prefix filters (e.g. 'vless-', 'proxy-') to monitor health status. Required for leastPing balancers.":
        'Выберите теги outbound’ов или введите фильтры по префиксу (например, «vless-», «proxy-»), чтобы следить за их состоянием. Обязательно для балансировщиков leastPing.',
    'Advanced stealth health checks for balancers':
        'Продвинутые скрытные проверки состояния для балансировщиков',
    'Subject Selector (Outbounds to Watch)': 'Селектор (за какими outbound’ами следить)',
    "Select outbound tags or enter prefix filters (e.g. 'vless-', 'proxy-') for burst stealth health checks.":
        'Выберите теги outbound’ов или введите фильтры по префиксу (например, «vless-», «proxy-») для скрытных пакетных проверок.',

    // ── Core settings ───────────────────────────────────────────────────────
    'Policy': 'Политики',
    'General Settings': 'Общие настройки',
    'Core Compatibility & Generators': 'Совместимость с ядром и генераторы',
    'Target Xray-core Version': 'Целевая версия Xray-core',
    'WARP Worker URL': 'URL воркера WARP',
    'Use Observatory for steady periodic checks, or Burst Observatory for randomised stealth checks. Pick one based on how your balancers are set up.':
        'Observatory делает обычные периодические проверки, Burst Observatory — случайные скрытные. Выбирайте по тому, как устроены ваши балансировщики.',
    'Statistics': 'Статистика',
    'Enable internal traffic counters (Required for panels)':
        'Включить внутренние счётчики трафика (нужны панелям)',
    'gRPC API': 'gRPC API',
    'Control Xray via gRPC (Required for panels)':
        'Управление Xray по gRPC (нужно панелям)',
    'Remember to add an inbound with protocol dokodemo-door, listening on 127.0.0.1:10085 and routed to this API tag.':
        'Не забудьте добавить inbound с протоколом dokodemo-door, который слушает 127.0.0.1:10085 и маршрутизируется на этот тег API.',
    'Local Policy': 'Локальные политики',
    'Timeouts & System Stats': 'Таймауты и системная статистика',
    'System Traffic Counters': 'Системные счётчики трафика',
    'Level 0 (Default User) Settings': 'Настройки уровня 0 (обычный пользователь)',
    'Log Configuration': 'Настройка логов',
    'System output logs': 'Системные логи',

    // ── Outbound selector / tag input ───────────────────────────────────────
    'Select All': 'Выбрать все',
    'Deselect All': 'Снять все',
    'Filter nodes...': 'Фильтр узлов...',
    'Exact match': 'Точное совпадение',
    'Prefix match': 'Совпадение по префиксу',
    'Preview (typing)': 'Предпросмотр (набор)',
    'Add Prefix or Tag Filter': 'Добавить фильтр по префиксу или тегу',
    'Press Enter to add': 'Нажмите Enter, чтобы добавить',
    'Active Selectors:': 'Активные селекторы:',
    'Tags reordered': 'Порядок тегов изменён',
    'Sorted alphabetically (A-Z)': 'Отсортировано по алфавиту (А–Я)',
    'Sorted: Plain items first': 'Отсортировано: сначала обычные записи',
    'Loading DB...': 'Загружаем базу...',
    'Sort options': 'Варианты сортировки',
    'Sort': 'Сортировка',
    'Alphabetical (A-Z)': 'По алфавиту (А–Я)',
    'Plain items first': 'Сначала обычные записи',

    // ── Config inspector hook ───────────────────────────────────────────────
    'Generated new HWID': 'Создан новый HWID',
    'Detected system parameters': 'Параметры системы определены',
    'JSON beautified': 'JSON отформатирован',
    'Parsed & beautified as JSON': 'Разобрано и отформатировано как JSON',
    'Could not beautify: input is not valid JSON':
        'Не удалось отформатировать: на входе не JSON',
    'Warning: Provider returned announcement/dummy nodes':
        'Внимание: провайдер вернул объявления или пустышки вместо узлов',
    'Parse failed': 'Не удалось разобрать',
    'Node added to outbounds': 'Узел добавлен в outbound’ы',
    'Inbound added': 'Inbound добавлен',

    // ── Diagnostics ─────────────────────────────────────────────────────────
    'System Diagnostics': 'Диагностика',
    'Xray Configuration Audit': 'Проверка конфига Xray',
    'Configuration is Perfect!': 'С конфигом всё в порядке!',
    'No issues or potential conflicts detected in your current setup.':
        'Ни проблем, ни возможных конфликтов в текущей настройке не найдено.',
    'Critical': 'Критично',
    'Warnings': 'Предупреждения',
    'Hints': 'Подсказки',
    'Got it': 'Понятно',

    // ── Remnawave connection ────────────────────────────────────────────────
    'API Token': 'Токен API',
    'from your panel settings.': 'из настроек вашей панели.',
    'Panel URL': 'Адрес панели',
    'Paste your token here...': 'Вставьте токен сюда...',
    'Available Profiles': 'Доступные профили',
    'Disconnect': 'Отключить',
    'Change URL': 'Сменить адрес',
    'Please fill URL and API Token': 'Заполните адрес и токен API',
    'Connection failed': 'Не удалось подключиться',

    // ── Git ─────────────────────────────────────────────────────────────────
    'Diff View': 'Просмотр различий',
    'Show only changes + 10 lines of context': 'Только изменения плюс 10 строк контекста',
    'Compact (+10 context)': 'Компактно (+10 строк)',
    'Show entire file': 'Показать файл целиком',
    'Full File': 'Весь файл',
    'No changes detected between versions': 'Между версиями нет изменений',
    '@@ {n} unchanged line hidden (lines {from}–{to}) @@|@@ {n} unchanged lines hidden (lines {from}–{to}) @@':
        '@@ скрыта {n} неизменённая строка (строки {from}–{to}) @@|@@ скрыто {n} неизменённые строки (строки {from}–{to}) @@|@@ скрыто {n} неизменённых строк (строки {from}–{to}) @@',
    'Clean up duplicates': 'Убрать дубликаты',
    'Purge Commit Log': 'Очистить журнал коммитов',
    'Git Commits': 'Коммиты Git',
    'Save or edit your config to create commits.':
        'Сохраните или отредактируйте конфиг, чтобы появились коммиты.',
    'Delete this commit': 'Удалить этот коммит',
    'Select a git commit from the left log to inspect visual diff and rollback':
        'Выберите коммит в журнале слева, чтобы посмотреть различия и откатиться',
    'Git Commit Changes': 'Коммит изменений',
    'Branch': 'Ветка',
    'New Commit Hash': 'Хеш нового коммита',
    'Staged Changes': 'Подготовленные изменения',
    'Describe what changed in this config version...':
        'Опишите, что изменилось в этой версии конфига...',
    '✓ Saved to memory & UI updated': '✓ Сохранено в памяти, интерфейс обновлён',
    'Already at HEAD (no changes to commit)': 'Уже на HEAD — коммитить нечего',

    // ── Template picker ─────────────────────────────────────────────────────
    'Panel templates': 'Шаблоны из панели',
    'Search templates…': 'Поиск шаблонов…',
    'New template': 'Новый шаблон',
    'Not connected to Remnawave — connect in the header to load or save templates.':
        'Нет подключения к Remnawave — подключитесь в шапке, чтобы загружать и сохранять шаблоны.',
    'Template name': 'Имя шаблона',
    'Unsaved JSON edits': 'Несохранённые правки JSON',
    'Could not decode that YAML body': 'Не удалось раскодировать это YAML-тело',
    'Fix the JSON before saving': 'Исправьте JSON перед сохранением',
    'Name the template first': 'Сначала дайте шаблону имя',
    'Template body copied': 'Тело шаблона скопировано',

    // ── Inbound ─────────────────────────────────────────────────────────────
    'Refresh Interval': 'Интервал обновления',
    'Concurrency': 'Параллельность',
    'Traffic Sniffing': 'Sniffing трафика',
    'Enable Sniffing': 'Включить sniffing',
    'Analyze traffic to determine destination domain and protocol.':
        'Разбирает трафик, чтобы определить домен назначения и протокол.',
    'Inbound Editor': 'Редактор inbound',
    'Inbound Connectivity': 'Подключение inbound',
    'TUN Interface Settings': 'Настройки интерфейса TUN',

    // ── Routing manager ─────────────────────────────────────────────────────
    'Routing Manager': 'Маршрутизация',
    'Click a rule below to jump to it and fix the issue.':
        'Нажмите на правило ниже, чтобы перейти к нему и исправить.',
    ' (+{n} more)': ' (+ещё {n})',
    'Search by name, domain, ip...': 'Поиск по имени, домену, IP...',
    'Search by tag, strategy, target...': 'Поиск по тегу, стратегии, цели...',
    'Cannot close — {n} rule has errors that will crash Xray|Cannot close — {n} rules have errors that will crash Xray':
        'Нельзя закрыть — в {n} правиле ошибки, из-за которых Xray упадёт|Нельзя закрыть — в {n} правилах ошибки, из-за которых Xray упадёт|Нельзя закрыть — в {n} правилах ошибки, из-за которых Xray упадёт',

    // ── Misc ────────────────────────────────────────────────────────────────
    'Partial Configuration': 'Частичная конфигурация',
    'Validation Errors': 'Ошибки проверки',
    'Source Configuration': 'Исходная конфигурация',
    'Keys Pair Generated!': 'Пара ключей создана!',
    'Generated Public Key': 'Полученный публичный ключ',
    'Public Key copied!': 'Публичный ключ скопирован!',
    'JSON array detected, but no valid outbounds found':
        'Это JSON-массив, но подходящих outbound’ов в нём нет',
    'Configuration loaded from file': 'Конфигурация загружена из файла',
    'Invalid JSON file': 'Некорректный JSON-файл',
    'Please fix validation errors before saving':
        'Исправьте ошибки проверки перед сохранением',
    'Welcome to Xray GUI': 'Добро пожаловать в Xray GUI',
    'Drop your config.json anywhere, or choose a template to start.':
        'Перетащите config.json в любое место или начните с шаблона.',
    'Or import from sources:': 'Или импортируйте из источника:',
    'Remnawave Panel': 'Панель Remnawave',
    'Xray Config Editor': 'Редактор конфигов Xray',
    'Drop config.json here': 'Перетащите config.json сюда',
    'Create Empty': 'Создать пустой',
    '{net} configuration': 'Настройка {net}',
    'Path': 'Путь',
    'Mode': 'Режим',
    'Official Xray-core Documentation': 'Официальная документация Xray-core',
    'WARP Engine by warp-generator.github.io': 'Движок WARP — warp-generator.github.io',

    // ── Schema-driven form fields ───────────────────────────────────────────
    'Tag / Alias': 'Тег / название',
    'Unique identifier for routing and logs.':
        'Уникальный идентификатор для маршрутизации и логов.',
    'Port or port range (e.g. 1080 or 10000-20000) to listen on.':
        'Порт или диапазон портов для прослушивания (например, 1080 или 10000-20000).',
    'IP address to bind the listener to. Default is 0.0.0.0 (all interfaces).':
        'IP-адрес, на котором слушать. По умолчанию 0.0.0.0 (все интерфейсы).',
    'The protocol used to accept incoming traffic.':
        'Протокол, по которому принимается входящий трафик.',
    'Enabled': 'Включено',
    'Toggle to enable or disable this feature.': 'Включает или выключает эту функцию.',
    'Destination Override': 'Переопределение назначения',
    'Override target destination based on sniffed protocol (e.g., redirect HTTP to FakeDNS).':
        'Переопределяет назначение по результату sniffing (например, отправляет HTTP в FakeDNS).',
    'Metadata Only': 'Только метаданные',
    'Only sniff connection metadata (like SNI or IP headers) without inspecting actual payload.':
        'Разбирать только метаданные соединения (SNI, заголовки IP), не заглядывая в содержимое.',
    'Excluded Domains': 'Исключённые домены',
    'List of domains to exclude from sniffing.': 'Домены, которые не разбирать через sniffing.',
    'Excluded IPs': 'Исключённые IP',
    'List of IP addresses/CIDRs to exclude from sniffing.':
        'IP-адреса и диапазоны CIDR, которые не разбирать через sniffing.',
    'Route Only': 'Только для маршрутизации',
    'Only use sniffed info for routing. Do not override destination.':
        'Использовать результат sniffing только для маршрутизации, не подменяя назначение.',
    'Allocation Strategy': 'Стратегия выделения портов',
    'How ports are allocated: Always listen on all ports, or random port rotation.':
        'Как выделяются порты: слушать все сразу или случайно их менять.',
    'Interval in minutes to refresh port allocation.':
        'Интервал обновления выделенных портов, в минутах.',
    'Number of concurrent ports to allocate.': 'Сколько портов выделять одновременно.',
    'Query Timeout': 'Таймаут запроса',
    'Per-server query timeout.': 'Таймаут запроса для каждого сервера.',
    'Extended TTL for stale cache entries.':
        'Продлённый TTL для устаревших записей кэша.',
    'Deduplication Interval': 'Интервал дедупликации',
    'TCP keep-alive idle time.': 'Время простоя до TCP keep-alive.',
    'TCP keep-alive interval.': 'Интервал TCP keep-alive.',
    'TCP user timeout.': 'TCP user timeout.',
    'Min interval between POSTs.': 'Минимальный интервал между POST-запросами.',
    'Keep-Alive Period': 'Период keep-alive',
    'H2/H3 keep-alive period in seconds.': 'Период keep-alive для H2/H3, в секундах.',
    'Show Debug Logs': 'Показывать отладочные логи',
    'Print Reality keys and debug info to server log on startup.':
        'Печатать ключи REALITY и отладочные данные в лог сервера при запуске.',
    'PROXY Protocol Version (xver)': 'Версия PROXY protocol (xver)',
    'Sends PROXY protocol header to destination. 0: disable, 1: PROXY v1, 2: PROXY v2.':
        'Отправляет заголовок PROXY protocol на целевой сервер. 0 — выключено, 1 — PROXY v1, 2 — PROXY v2.',
    'Server Names (SNI List)': 'Имена серверов (список SNI)',
    'List of server names (SNI) that the server allows clients to use.':
        'Имена серверов (SNI), которые сервер разрешает использовать клиентам.',
    'Reality private key (x25519). Keep this secret!':
        'Приватный ключ REALITY (x25519). Держите его в секрете!',
    'Short IDs': 'Короткие идентификаторы (shortIds)',
    'Hexadecimal strings used to authenticate clients. CSV or comma separated.':
        'Шестнадцатеричные строки для аутентификации клиентов, через запятую.',
    'Fingerprint (uTLS)': 'Fingerprint (uTLS)',
    'TLS Client Hello fingerprint to simulate standard browser behavior.':
        'Отпечаток TLS Client Hello, чтобы соединение выглядело как из обычного браузера.',
    'SpiderX Path': 'Путь SpiderX',
    'Path the client requests on the target site after the handshake. A path the target actually serves is best — the dice only makes one that looks real.':
        'Путь, который клиент запрашивает на сайте-цели после рукопожатия. Лучше всего — путь, который на цели действительно есть: кубик делает только правдоподобный на вид.',
    'Short ID': 'Короткий идентификатор',
    'Specific short ID matching the server list.':
        'Конкретный shortId из списка на сервере.',
    'Min Client Version': 'Мин. версия клиента',
    'Minimum required Xray client version (e.g. 1.8.0, 24.9.0, or 0.0.0 for any). Leave empty if not restricting.':
        'Минимальная версия клиента Xray (например, 1.8.0, 24.9.0 или 0.0.0 — любая). Оставьте пустым, если не ограничиваете.',
    'Max Client Version': 'Макс. версия клиента',
    'Maximum allowed Xray client version (e.g. 1.8.24, 24.9.0, or 0.0.0 for any). Leave empty if not restricting.':
        'Максимальная версия клиента Xray (например, 1.8.24, 24.9.0 или 0.0.0 — любая). Оставьте пустым, если не ограничиваете.',
    'Max Time Difference': 'Макс. расхождение времени',
    'Maximum allowed timestamp difference between client and server.':
        'Максимально допустимое расхождение времени между клиентом и сервером.',
    'ML-DSA-65 Seed': 'Seed для ML-DSA-65',
    'Post-quantum signature seed (base64 string) for PQ-REALITY.':
        'Seed постквантовой подписи (строка base64) для PQ-REALITY.',
    'Base64 seed string': 'Строка seed в base64',
    'Min TLS Version': 'Мин. версия TLS',
    'Minimum TLS version allowed for handshake.':
        'Минимальная версия TLS, допустимая при рукопожатии.',
    'Max TLS Version': 'Макс. версия TLS',
    'Maximum TLS version allowed for handshake.':
        'Максимальная версия TLS, допустимая при рукопожатии.',
    'Allow Insecure Connections': 'Разрешить небезопасные соединения',
    'Disable TLS certificate verification (insecure, use with caution!).':
        'Отключает проверку TLS-сертификата — небезопасно, используйте осознанно.',
    'Reject Unknown SNI': 'Отклонять неизвестный SNI',
    'Reject connection attempts with unknown SNI.':
        'Отклонять попытки подключения с неизвестным SNI.',
    'Master Key Log File (SSLKEYLOGFILE)': 'Файл лога мастер-ключей (SSLKEYLOGFILE)',
    'File path to write TLS master keys for Wireshark traffic inspection/debugging.':
        'Путь к файлу, куда писать мастер-ключи TLS для разбора трафика в Wireshark.',
    'Pinned Peer Certificate SHA-256': 'Закреплённый SHA-256 сертификата',
    'ML-DSA-65 Public Key (PQ-REALITY)': 'Публичный ключ ML-DSA-65 (PQ-REALITY)',
    'Post-Quantum signature verification key for client.':
        'Ключ проверки постквантовой подписи для клиента.',
    'Base64 verify key': 'Ключ проверки в base64',
    'Disable System Root CA': 'Не доверять системным корневым CA',
    'Ignore system root certificates and only trust custom provided certificates.':
        'Игнорировать системные корневые сертификаты и доверять только указанным вручную.',
    'Enable Session Resumption': 'Разрешить возобновление сессий',
    'Allow TLS session ticket resumption to speed up re-connections.':
        'Разрешает возобновление TLS-сессий по тикету, чтобы переподключения были быстрее.',
    'Cipher Suites': 'Наборы шифров',
    'Colon-separated TLS cipher suites.': 'Наборы шифров TLS, через двоеточие.',
    'Rule Tag / Alias': 'Тег правила',
    'Unique identifier or label for this rule in stats and metrics.':
        'Уникальный идентификатор этого правила в статистике и метриках.',
    'EDNS Client Subnet (ECS)': 'EDNS Client Subnet (ECS)',
    'Client IP or CIDR network forwarded in DNS queries for CDN localization.':
        'IP клиента или сеть CIDR, которые передаются в DNS-запросах, чтобы CDN отдавал ближайший узел.',
    'DNS Fallback Strategy': 'Стратегия fallback для DNS',
    'Strategy for falling back to secondary DNS servers.':
        'Как переходить на дополнительные DNS-серверы.',
    'DNS Query Strategy': 'Стратегия DNS-запросов',
    'Preference for DNS query domain resolution.':
        'Как предпочтительно разрешать домены в DNS-запросах.',
    'DNS Cache Strategy': 'Стратегия кэша DNS',

    // ── Builder option labels ───────────────────────────────────────────────
    'Exclude from the build': 'Исключить из сборки',
    'Include in the build': 'Включить в сборку',
    'Local Balancer — panel template': 'Локальный балансировщик — шаблон панели',
    'Local Balancer Builder': 'Конструктор локального балансировщика',
    'Saving…': 'Сохраняем…',
    'Save JSON to panel': 'Сохранить JSON в панель',
    'Save to panel': 'Сохранить в панель',
    'Load shown config': 'Загрузить показанный конфиг',
    'Load into editor': 'Загрузить в редактор',
    'Refresh hosts': 'Обновить хосты',
    'Load hosts': 'Загрузить хосты',
    'Fastest by measured load': 'Самый быстрый по измеренной нагрузке',
    'Fastest by probe RTT': 'Самый быстрый по RTT проверки',
    'Rotate through nodes': 'По кругу между узлами',
    'Pick at random': 'Случайный выбор',
    'None': 'Нет',
    'Fail the connection': 'Обрывать соединение',
    'First node': 'Первый узел',
    'Degrade to node #1 instead of failing': 'Уходить на узел №1 вместо обрыва',
    'burstObservatory (concurrent pings)': 'burstObservatory (пинги параллельно)',
    'Measures latency to the probe URL from every node at once':
        'Измеряет задержку до URL проверки со всех узлов одновременно',
    'observatory (sequential)': 'observatory (последовательно)',
    'Classic probe, one node after another': 'Классическая проверка, узел за узлом',
    'Balancer picks without measuring': 'Балансировщик выбирает без измерений',
    'Same tag as the entry host': 'Тот же тег, что у точки входа',
    'The usual choice: matches the shared tag set below':
        'Обычный вариант: совпадает с общим тегом, заданным ниже',
    'Host tag matches a pattern': 'Тег хоста подходит под шаблон',
    'Host remark matches a pattern': 'Название хоста подходит под шаблон',
    'An explicit list of hosts': 'Явный список хостов',
    'The hidden hosts (the pool)': 'Скрытые хосты (пул)',
    'The nodes sitting behind a visible entry host':
        'Узлы, которые стоят за видимой точкой входа',
    'Visible hosts': 'Видимые хосты',
    'All hosts': 'Все хосты',
    'Create a new template': 'Создать новый шаблон',
    'Pick an inbound…': 'Выберите inbound…',
    'Load panel hosts to choose one': 'Загрузите хосты панели, чтобы выбрать',
    'Generated template': 'Готовый шаблон',
    'Generated config': 'Готовый конфиг',
    'Fleet': 'Большой пул',
    'proxy / proxy-2 tags, one balancer, 10s burst probe. Good for 2-4 nodes in one location.':
        'Теги proxy / proxy-2, один балансировщик, burst-проверка раз в 10 с. Подходит для 2–4 узлов в одной локации.',
    'fb-0 / fb-1 tags, fallback to the first node, baselines, 60s probe. Built for large pools.':
        'Теги fb-0 / fb-1, fallback на первый узел, baseline-значения, проверка раз в 60 с. Для больших пулов.',
    "It is the id from that user's vless:// link in the panel.":
        'Это id из ссылки vless:// этого пользователя в панели.',
    'The entry host needs a template to point at.':
        'Точке входа нужен шаблон, на который она будет ссылаться.',

    // ── Transport and security option descriptions ──────────────────────────
    'Standard reliable stream': 'Обычный надёжный поток',
    'Standard web transport': 'Обычный веб-транспорт',
    'Next-gen HTTP transport': 'HTTP-транспорт нового поколения',
    'High-performance split stream': 'Высокопроизводительный раздельный поток',
    'Modern RPC framework': 'Современный RPC-фреймворк',
    'Aggressive UDP transport': 'Агрессивный UDP-транспорт',
    'Raw socket access': 'Прямой доступ к сокету',
    'Modern WebSocket alternative': 'Современная альтернатива WebSocket',
    'Plaintext (unsafe)': 'Без шифрования (небезопасно)',
    'Standard SSL/TLS encryption': 'Обычное шифрование SSL/TLS',
    'Next-gen stealth encryption': 'Скрытное шифрование нового поколения',
    'No obfuscation': 'Без обфускации',
    'Simulate HTTP request': 'Имитировать HTTP-запрос',

    // ── Routing rule fields ─────────────────────────────────────────────────
    'Outbound': 'Outbound',
    'Load Balancer': 'Балансировщик',
    'Target Port': 'Порт назначения',
    'Source Port': 'Порт источника',
    'Source port or port range.': 'Порт или диапазон портов источника.',
    'Local Port': 'Локальный порт',
    'Local port (for transparent proxy).':
        'Локальный порт (для прозрачного проксирования).',
    'Match VLESS route header.': 'Сопоставление по заголовку маршрута VLESS.',
    'Source IP (CIDR)': 'IP источника (CIDR)',
    'Source IP/CIDR match list.': 'Список IP или CIDR источника для сопоставления.',
    'Local IP': 'Локальный IP',
    'Local IP match list (for transparent proxy).':
        'Список локальных IP для сопоставления (для прозрачного проксирования).',
    'User (Email)': 'Пользователь (email)',
    'User email match list.': 'Список email пользователей для сопоставления.',
    'Process Name': 'Имя процесса',
    'Process name match list.': 'Список имён процессов для сопоставления.',
    'Callback URL': 'URL обратного вызова',
    'URL to POST webhook notifications.': 'URL, на который отправляются вебхуки.',
    'Deduplication (seconds)': 'Дедупликация (секунды)',
    'Deduplication interval in seconds.': 'Интервал дедупликации в секундах.',
    'Headers': 'Заголовки',
    'Custom HTTP headers for the webhook request.':
        'Свои HTTP-заголовки для запроса вебхука.',

    // ── DNS fields ──────────────────────────────────────────────────────────
    'DNS Tag (Inbound)': 'Тег DNS (inbound)',
    'Tag for the DNS module (used for routing DNS queries).':
        'Тег DNS-модуля — по нему маршрутизируются DNS-запросы.',
    'Client IP (ECS)': 'IP клиента (ECS)',
    'Your public IP (for ECS)': 'Ваш публичный IP (для ECS)',
    'Client IP for EDNS Client Subnet (global).':
        'IP клиента для EDNS Client Subnet (глобально).',
    'Query Strategy': 'Стратегия запросов',
    'Global query strategy: UseIP (dual-stack), UseIPv4, UseIPv6.':
        'Глобальная стратегия запросов: UseIP (двойной стек), UseIPv4, UseIPv6.',
    'Enable Parallel Query': 'Параллельные запросы',
    'Enable parallel querying of all DNS servers simultaneously.':
        'Опрашивать все DNS-серверы одновременно.',
    'Use System Hosts': 'Использовать системный hosts',
    'Whether to use system hosts file.': 'Использовать ли системный файл hosts.',
    'Disable Cache': 'Отключить кэш',
    'Disable DNS cache globally.': 'Отключить кэш DNS полностью.',
    'Serve Stale Cache': 'Отдавать устаревший кэш',
    'Serve stale/expired cache entries when upstream is slow or unresponsive.':
        'Отдавать устаревшие записи кэша, когда вышестоящий сервер медлит или молчит.',
    'Serve Expired TTL': 'TTL для устаревших ответов',
    'Extended TTL for serving stale cache entries.':
        'Продлённый TTL, с которым отдаются устаревшие записи кэша.',
    'Disable Fallback': 'Отключить fallback',
    'Disable fallback when expectIPs/unexpectedIPs do not match.':
        'Не использовать fallback, когда expectIPs / unexpectedIPs не совпали.',
    'Disable Fallback If Match': 'Без fallback при совпадении',
    'Disable fallback if at least one server matched.':
        'Не использовать fallback, если совпал хотя бы один сервер.',
    'Fallback Strategy': 'Стратегия fallback',
    'When to fallback to secondary DNS servers.':
        'Когда переходить на дополнительные DNS-серверы.',
    'Cache Strategy': 'Стратегия кэша',
    'Cache strategy for DNS query responses.':
        'Стратегия кэширования ответов на DNS-запросы.',
    'Server Address': 'Адрес сервера',
    'DNS server address. E.g. 8.8.8.8, https://dns.google/dns-query, udp://1.1.1.1':
        'Адрес DNS-сервера. Например, 8.8.8.8, https://dns.google/dns-query, udp://1.1.1.1',
    'DNS server port (default 53).': 'Порт DNS-сервера (по умолчанию 53).',
    'Unexpected IPs (Optional)': 'Неожидаемые IP (необязательно)',
    'List of unexpected IPs (e.g. geoip:cn) that trigger fallback.':
        'IP, которых быть не должно (например, geoip:cn) — при их появлении включается fallback.',
    "Skip this server when other servers' expectIPs match failed.":
        'Пропускать этот сервер, если expectIPs других серверов не совпали.',
    'Final Query': 'Финальный запрос',
    'If enabled, always query even if other servers already matched.':
        'Если включено, запрос делается всегда, даже когда другие серверы уже совпали.',
    'Per-server query timeout in milliseconds.':
        'Таймаут запроса для этого сервера, в миллисекундах.',
    'Client IP for EDNS Client Subnet (ECS) on this server.':
        'IP клиента для EDNS Client Subnet (ECS) на этом сервере.',
    'Per-server query strategy: UseIP (dual-stack), UseIPv4, UseIPv6.':
        'Стратегия запросов для этого сервера: UseIP (двойной стек), UseIPv4, UseIPv6.',
    'Disable DNS cache for this server.': 'Отключить кэш DNS для этого сервера.',
    'Serve Stale': 'Отдавать устаревшее',
    'Serve stale/expired cache entries from this server.':
        'Отдавать устаревшие записи кэша с этого сервера.',
    'Extended TTL for stale cache entries in seconds.':
        'Продлённый TTL для устаревших записей кэша, в секундах.',
    'Server Tag': 'Тег сервера',
    'Unique tag for this server, used in DNS routing.':
        'Уникальный тег этого сервера, используется в маршрутизации DNS.',
    'IP Pool (CIDR)': 'Пул IP (CIDR)',
    'CIDR for FakeIP address pool.': 'Диапазон CIDR для пула адресов FakeIP.',
    'Size': 'Размер',
    'Maximum number of domain-IP mappings.':
        'Максимальное число связок «домен — IP».',
    'Cloudflare only': 'Только Cloudflare',
    'The common default: 1.1.1.1 with 8.8.8.8 as the second opinion.':
        'Обычный выбор по умолчанию: 1.1.1.1, а 8.8.8.8 — вторым мнением.',
    '1.1.1.1 and its secondary 1.0.0.1.': '1.1.1.1 и дополнительный 1.0.0.1.',
    'Google only': 'Только Google',
    '8.8.8.8 and 8.8.4.4.': '8.8.8.8 и 8.8.4.4.',
    '9.9.9.9 — filters known-malicious domains.':
        '9.9.9.9 — фильтрует известные вредоносные домены.',
    '94.140.14.14 — blocks ads and trackers at the DNS level.':
        '94.140.14.14 — блокирует рекламу и трекеры на уровне DNS.',
    'System resolver': 'Системный резолвер',
    'Whatever the machine already uses. Answers come from the local network.':
        'Тот, который уже настроен в системе. Ответы приходят из локальной сети.',

    // ── Outbound strategy options ───────────────────────────────────────────
    'Reject': 'Отклонять',
    'Recommended': 'Рекомендуется',
    'Allow': 'Разрешать',
    'Skip': 'Пропускать',
    'AsIs (Default)': 'AsIs (по умолчанию)',
    'Leave domain as is without prior resolution':
        'Оставить домен как есть, без предварительного разрешения',
    'Resolve and connect via IP': 'Разрешить имя и подключаться по IP',
    'Resolve and prefer IPv4 only': 'Разрешить имя, использовать только IPv4',
    'Resolve and prefer IPv6 only': 'Разрешить имя, использовать только IPv6',
    'Prefer IPv4, fallback to IPv6': 'Сначала IPv4, при неудаче IPv6',
    'Prefer IPv6, fallback to IPv4': 'Сначала IPv6, при неудаче IPv4',
    'Enforce IP connection (fails if unresolved)':
        'Только по IP — если имя не разрешилось, соединения не будет',
    'Enforce IPv4 connection': 'Только по IPv4',
    'Enforce IPv6 connection': 'Только по IPv6',
    'Enforce IPv4, fallback to IPv6': 'Только IPv4, при неудаче IPv6',
    'Enforce IPv6, fallback to IPv4': 'Только IPv6, при неудаче IPv4',
    'Silent Drop': 'Молча отбрасывать',
    'Return 403 Forbidden': 'Отвечать 403 Forbidden',
    'UUID / ID': 'UUID / ID',
    'Use domain as provided': 'Использовать домен как есть',
    'Resolve if no domain match': 'Разрешать имя, если по домену не совпало',
    'Resolve before matching': 'Разрешать имя до сопоставления',
    'UI Mode': 'Режим формы',
    'JSON': 'JSON',

    // ── Policy / stats / logs ───────────────────────────────────────────────
    'Inbound Uplink Stats': 'Статистика отдачи по inbound',
    'Collect uplink stats for all inbounds.':
        'Собирать статистику исходящего трафика по всем inbound.',
    'Inbound Downlink Stats': 'Статистика приёма по inbound',
    'Collect downlink stats for all inbounds.':
        'Собирать статистику входящего трафика по всем inbound.',
    'Outbound Uplink Stats': 'Статистика отдачи по outbound',
    'Collect uplink stats for all outbounds.':
        'Собирать статистику исходящего трафика по всем outbound.',
    'Outbound Downlink Stats': 'Статистика приёма по outbound',
    'Collect downlink stats for all outbounds.':
        'Собирать статистику входящего трафика по всем outbound.',
    'Handshake timeout. Default: 4s.': 'Таймаут рукопожатия. По умолчанию 4 с.',
    'Connection Idle Timeout': 'Таймаут простоя соединения',
    'Connection idle timeout. Default: 300s.':
        'Таймаут простоя соединения. По умолчанию 300 с.',
    'Uplink Only Timeout': 'Таймаут после закрытия приёма',
    'Time to wait after downlink closes. Default: 2s.':
        'Сколько ждать после закрытия входящего потока. По умолчанию 2 с.',
    'Downlink Only Timeout': 'Таймаут после закрытия отдачи',
    'Time to wait after uplink closes. Default: 5s.':
        'Сколько ждать после закрытия исходящего потока. По умолчанию 5 с.',
    'User Uplink Stats': 'Статистика отдачи по пользователям',
    'Enable per-user uplink traffic statistics.':
        'Считать исходящий трафик по каждому пользователю.',
    'User Downlink Stats': 'Статистика приёма по пользователям',
    'Enable per-user downlink traffic statistics.':
        'Считать входящий трафик по каждому пользователю.',
    'User Online Count Stats': 'Статистика онлайна по пользователям',
    'Enable per-user online count statistics.':
        'Считать количество онлайн-сессий по каждому пользователю.',
    'Buffer Size (KB)': 'Размер буфера (КБ)',
    'Internal buffer size per request. Default depends on platform.':
        'Размер внутреннего буфера на запрос. По умолчанию зависит от платформы.',
    'Log Level': 'Уровень логов',
    'Level of verbosity for xray logs.': 'Насколько подробными будут логи Xray.',
    'Access Log Path': 'Путь к access-логу',
    'Error Log Path': 'Путь к error-логу',
    'Enable DNS Log': 'Логировать DNS',
    'Enable DNS query logging (requires loglevel to be debug or info).':
        'Логировать DNS-запросы (нужен уровень логов debug или info).',
    'Mask IP Address': 'Маскировать IP-адреса',
    'Mask client IP addresses in logs. Options: quarter, half, full, or custom mask string.':
        'Маскировать IP клиентов в логах: quarter, half, full или своя маска.',
    'API Outbound Tag': 'Тег outbound для API',
    'The tag used by other components to refer to this API.':
        'Тег, по которому другие компоненты обращаются к этому API.',
    'Listen Address': 'Адрес прослушивания',
    'gRPC server listen address (IP:port).':
        'Адрес, на котором слушает gRPC-сервер (IP:порт).',
    'Enabled Services': 'Включённые сервисы',
    'Services enabled in the gRPC API (comma-separated).':
        'Сервисы, включённые в gRPC API, через запятую.',

    // ── Balancer editor options ─────────────────────────────────────────────
    'Balancer Tag': 'Тег балансировщика',
    'Unique identifier for this balancer, used in routing rules.':
        'Уникальный идентификатор балансировщика, используется в правилах маршрутизации.',
    'Fallback Tag (Optional)': 'Тег fallback (необязательно)',
    'Outbound tag to use when no selected outbound is available.':
        'Тег outbound, который используется, когда ни один выбранный недоступен.',
    'Random': 'Случайно',
    'Standard load balancing': 'Обычная балансировка',
    'Round Robin': 'По кругу',
    'Sequential selection': 'Последовательный выбор',
    'Least Ping': 'Наименьший пинг',
    'Best latency (Requires Observatory)':
        'Наименьшая задержка (нужен Observatory)',
    'Least Load': 'Наименьшая нагрузка',
    'Least active connections': 'Меньше всего активных соединений',
    'Expected Nodes': 'Ожидаемое число узлов',
    'Number of expected nodes to probe.': 'Сколько узлов ожидается при проверке.',
    'Tolerance': 'Допуск',
    'RTT difference tolerance.': 'Допустимая разница RTT.',
    'Baselines': 'Baseline-значения',
    'Baseline RTT values (comma-separated).':
        'Опорные значения RTT, через запятую.',
    'Costs': 'Веса',
    'Cost adjustments for specific outbounds.':
        'Поправки веса для отдельных outbound.',
    'Destination URL': 'URL назначения',
    'URL used for probing, should return HTTP 204.':
        'URL для проверки — должен отвечать HTTP 204.',
    'Connectivity Check URL (Optional)': 'URL проверки связи (необязательно)',
    'URL for local connectivity check. Empty = disabled.':
        'URL для локальной проверки связи. Пусто — выключено.',
    'Average probe interval per outbound. Min 10s.':
        'Средний интервал проверки на каждый outbound. Минимум 10 с.',
    'Probe timeout.': 'Таймаут проверки.',
    'Sampling Count': 'Число замеров',
    'Number of recent probe results to keep.':
        'Сколько последних результатов проверки хранить.',
    'HTTP Method': 'HTTP-метод',
    'HTTP method for probing.': 'HTTP-метод для проверки.',
    'URL used for probing outbound connectivity.':
        'URL, по которому проверяется связность outbound.',
    'Probe Interval': 'Интервал проверки',
    'Enable Concurrency': 'Параллельные проверки',
    'Enable concurrent probing of all matched outbounds.':
        'Проверять все подходящие outbound одновременно.',

    // ── Sockopt / XHTTP / Finalmask options ─────────────────────────────────
    'Off': 'Выкл',
    'None (Default)': 'Нет (по умолчанию)',
    'Highest compatibility': 'Максимальная совместимость',
    'Full duplex (Fast)': 'Полный дуплекс (быстро)',
    'Single request': 'Один запрос',

    // ── Hosts, snippets and the rest ────────────────────────────────────────
    'Create host': 'Создать хост',
    'Save host': 'Сохранить хост',
    'No hosts loaded — press Refresh.': 'Хосты не загружены — нажмите «Обновить».',
    'No host matches that search.': 'Под этот поиск ни один хост не подходит.',
    'Editing host': 'Редактирование хоста',
    'No inbounds loaded — press Refresh': 'Inbound не загружены — нажмите «Обновить»',
    'None — plain host': 'Нет — обычный хост',
    'Leave to the client': 'Оставить на выбор клиента',
    'Not set': 'Не задано',
    'Panel snippet': 'Сниппет панели',
    'Local template': 'Локальный шаблон',
    'Save template': 'Сохранить шаблон',
    'Confirm: re-apply and restart nodes':
        'Подтвердить: применить заново и перезапустить ноды',
    'Sync to profiles': 'Синхронизировать с профилями',
    'Outbounds': 'Outbound’ы',
    'Resolved from the panel': 'Получено из панели',
    'Resolved from a local template': 'Получено из локального шаблона',
    '(mixed rules and outbounds)': '(смешанные правила и outbound’ы)',
    'No Auth': 'Без аутентификации',
    'No accounts defined.': 'Учётных записей нет.',
    'Auth is disabled.': 'Аутентификация отключена.',
    'Add one to enable password auth.':
        'Добавьте запись, чтобы включить вход по паролю.',
    '{protocol} credentials': 'Учётные данные {protocol}',
    'Fetching...': 'Загружаем...',
    'Fetch Remote': 'Загрузить по ссылке',
    'Hide HWID': 'Скрыть HWID',
    'Device HWID': 'HWID устройства',
    'Custom User-Agent...': 'Свой User-Agent...',
    'Hide Details': 'Скрыть подробности',
    'Device Info (HWID)': 'Данные устройства (HWID)',
    'Raw Text (.txt)': 'Текст (.txt)',
    'No matching domains/IPs found.': 'Подходящих доменов или IP не найдено.',
    'No items found.': 'Ничего не найдено.',
    'Xray supports multiple protocols like VLESS, VMess, Trojan, and Shadowsocks.':
        'Xray поддерживает VLESS, VMess, Trojan, Shadowsocks и другие протоколы.',
    'Listen IP': 'IP прослушивания',
    'IP address for the inbound to listen on. Default is 0.0.0.0 (all interfaces).':
        'IP-адрес, на котором слушает inbound. По умолчанию 0.0.0.0 (все интерфейсы).',
    'A unique name for this inbound to refer to it in routing rules.':
        'Уникальное имя этого inbound — по нему на него ссылаются правила маршрутизации.',
    'Xray supports VLESS, VMess, Trojan, Shadowsocks, Hysteria, etc.':
        'Xray поддерживает VLESS, VMess, Trojan, Shadowsocks, Hysteria и другие.',
    'Unique name for this outbound (used in routing rules).':
        'Уникальное имя этого outbound — используется в правилах маршрутизации.',
    'Generating...': 'Генерируем...',
    'Generate WARP': 'Сгенерировать WARP',
    'Restore 0.0.0.0/0': 'Вернуть 0.0.0.0/0',
    'Exclude Local': 'Исключить локальные',
    'Standard WARP (Direct)': 'Обычный WARP (напрямую)',
    'WARP Profile A (Optimized)': 'Профиль WARP A (оптимизированный)',
    'WARP Profile B (Optimized Alt)': 'Профиль WARP B (альтернативный)',
    'WARP Profile C (Aggressive)': 'Профиль WARP C (агрессивный)',
    'Registering WARP...': 'Регистрируем WARP...',
    'Generate & Add Outbound': 'Сгенерировать и добавить outbound',
    'Cloudflare WARP connectivity with standard AmneziaWG optimization.':
        'Подключение к Cloudflare WARP со стандартной оптимизацией AmneziaWG.',
    'Cloudflare WARP connectivity with alternative AmneziaWG optimization.':
        'Подключение к Cloudflare WARP с альтернативной оптимизацией AmneziaWG.',
    'Cloudflare WARP connectivity with aggressive AmneziaWG optimization.':
        'Подключение к Cloudflare WARP с агрессивной оптимизацией AmneziaWG.',
    'Basic structure with Direct & Block outbounds. Best for starting from scratch.':
        'Базовая структура с outbound direct и block. Хорошая точка старта с нуля.',
    'Socks5/HTTP inbounds + VLESS Proxy. Includes basic routing rules.':
        'Inbound socks5/HTTP плюс прокси VLESS. С базовыми правилами маршрутизации.',
    'VLESS-Reality Inbound configuration for server side.':
        'Конфигурация inbound VLESS-REALITY для серверной стороны.',
    'Russian sites direct': 'Российские сайты напрямую',
    'Banks, government portals, marketplaces and media that only work from a Russian address.':
        'Банки, госпорталы, маркетплейсы и медиа, которые работают только с российского адреса.',
    'IP/DNS leak checkers direct': 'Проверки утечек IP/DNS напрямую',
    'Sites like whoer.net and ipleak.net. Proxied, they report the exit node instead of your real connection.':
        'Сайты вроде whoer.net и ipleak.net. Через прокси они покажут выходную ноду, а не ваше реальное подключение.',
    'Connect Remnawave': 'Подключить Remnawave',
    'Select Profile': 'Выберите профиль',
    'Click to collapse': 'Нажмите, чтобы свернуть',
    'Click to expand': 'Нажмите, чтобы развернуть',
    'Exit Fullscreen': 'Выйти из полного экрана',
    'Fullscreen': 'Полный экран',
    'No outbounds available': 'Доступных outbound нет',
    'No outbounds match filter': 'Под фильтр не подходит ни один outbound',
    'Type and press Enter or Comma...': 'Введите и нажмите Enter или запятую...',
    'Gen Keys Pair': 'Сгенерировать пару ключей',
    'Gen Short ID': 'Сгенерировать shortId',
    'Milliseconds': 'Миллисекунды',
    'Seconds': 'Секунды',
    'Minutes': 'Минуты',
    'Hours': 'Часы',
    'WG + Obfuscator (Legacy Chain) imported':
        'WG с обфускатором (устаревшая цепочка) импортирован',
    'Direct WireGuard (Modern) imported':
        'WireGuard напрямую (современный вариант) импортирован',
    'Protocol might not be supported.': 'Протокол может не поддерживаться.',
    'Confirm Push?': 'Подтвердить отправку?',
    'Push': 'Отправить',
    'Confirm?': 'Подтвердить?',
    'Push Cloud': 'Отправить в облако',
    'The raw config text had a syntax error, so this action fell back to the last valid config.':
        'В сыром тексте конфига была ошибка синтаксиса, поэтому действие выполнено над последним корректным конфигом.',
    'Every host pointing at it serves the new body.':
        'Все хосты, которые на него ссылаются, теперь отдают новое содержимое.',
    'Panel is re-applying it to every profile that references it.':
        'Панель применяет его заново ко всем профилям, которые на него ссылаются.',
    'These are a copy - they no longer follow the panel snippet.':
        'Это копия — она больше не следует за сниппетом в панели.',
    'Invalid token or panel URL': 'Неверный токен или адрес панели',
    'Default Route': 'Маршрут по умолчанию',
    'JSON Mode': 'Режим JSON',
    'Your provider may require a different User-Agent or device authorization.':
        'Возможно, ваш провайдер ждёт другой User-Agent или авторизацию устройства.',
    'This copy no longer follows the panel snippet.':
        'Эта копия больше не следует за сниппетом в панели.',
    'It is stored base64-encoded and did not decode cleanly.':
        'Оно хранится в base64 и не раскодировалось корректно.',
    'Snippets': 'Сниппеты',
    // ── Remnawave module guides ─────────────────────────────────────────────
    'Config profile': 'Профиль конфига',
    'XRAY JSON template': 'Шаблон XRAY JSON',
    'Subscriber': 'Подписчик',
    'Snippet': 'Сниппет',
    'Node': 'Нода',
    'What a host is': 'Что такое хост',
    'One entry in a subscription: the address a client connects to, and the inbound that serves it.':
        'Одна запись в подписке: адрес, к которому подключается клиент, и inbound, который его обслуживает.',
    'Bind it to an inbound from a config profile — that is what fixes the protocol, the keys and the transport.':
        'Привяжите его к inbound из профиля конфига — именно это задаёт протокол, ключи и транспорт.',
    'Attach an Xray JSON template and the subscriber receives that whole config instead of a single link. A balancer reaches people this way and no other.':
        'Прикрепите шаблон Xray JSON — и подписчик получит целый конфиг вместо одной ссылки. Балансировщик доходит до людей только так.',
    'A hidden host never appears in a subscription on its own. Hidden hosts are the pool a template injects.':
        'Скрытый хост сам по себе в подписке не появится. Скрытые хосты — это пул, который подставляет шаблон.',
    'What a subscription template is': 'Что такое шаблон подписки',
    "The JSON a subscriber's client receives. The panel fills in the hosts; the template supplies everything around them — routing, balancer, DNS.":
        'Это JSON, который получает клиент подписчика. Хосты подставляет панель, а всё вокруг них — маршрутизацию, балансировщик, DNS — задаёт шаблон.',
    'A template carries no nodes of its own. It says which hosts to pull in, and the panel substitutes them when it renders the subscription.':
        'Своих узлов у шаблона нет. Он говорит, какие хосты взять, а панель подставляет их, когда собирает подписку.',
    "Saving a template to the panel is not enough to publish it: attach it to a visible host, and that host's subscribers get it.":
        'Сохранить шаблон в панель — ещё не значит опубликовать его: прикрепите его к видимому хосту, и подписчики этого хоста его получат.',
    'Form and JSON are two views of one object — switch between them as often as you like.':
        'Форма и JSON — два взгляда на один объект, переключайтесь сколько угодно.',
    'What a snippet is': 'Что такое сниппет',
    'A reusable array of routing rules or outbounds, stored once in the panel and shared by every config that references it.':
        'Переиспользуемый массив правил маршрутизации или outbound’ов: хранится в панели в одном месте и общий для всех конфигов, которые на него ссылаются.',
    'A config refers to it by name, and the panel replaces that reference with the body before the config ever reaches a node.':
        'Конфиг ссылается на него по имени, а панель заменяет ссылку содержимым ещё до того, как конфиг дойдёт до ноды.',
    'Editing the body here changes every profile that references it — that is the whole point of a snippet.':
        'Правка тела здесь меняет все профили, которые на него ссылаются, — ради этого сниппеты и нужны.',
    'Templates under “This browser” are local scratch copies. They never touch the panel.':
        'Шаблоны во вкладке «Этот браузер» — локальные черновики. Панели они не касаются.',

    // ── Strings rescued from template literals ──────────────────────────────
    'Download template': 'Скачать шаблон',
    'Download JSON': 'Скачать JSON',
    'Download {n} config|Download {n} configs':
        'Скачать {n} конфиг|Скачать {n} конфига|Скачать {n} конфигов',
    'Save as profile|Save as profiles':
        'Сохранить как профиль|Сохранить как профили|Сохранить как профили',
    'Panel': 'Панель',
    'This browser': 'Этот браузер',
    'Confirm: delete “{remark}”': 'Подтвердить удаление «{remark}»',
    'Panel host': 'Хост в панели',
    'Client config': 'Клиентский конфиг',
    'Panel template': 'Шаблон панели',
    'Form': 'Форма',
    'Nodes': 'Узлы',
    'Template': 'Шаблон',
    'Config': 'Конфиг',
    'Links / JSON': 'Ссылки / JSON',
    'Remnawave panel': 'Панель Remnawave',
    // ── Drag-and-drop, for screen readers ───────────────────────────────────
    'To pick up an item, press the space bar. While dragging, use the arrow keys to move it. Press space again to drop it, or escape to cancel.':
        'Чтобы взять элемент, нажмите пробел. Во время перетаскивания двигайте его стрелками. Нажмите пробел ещё раз, чтобы положить, или Esc, чтобы отменить.',
    'Picked up item {id}.': 'Элемент {id} взят.',
    'Item {id} is over position {target}.': 'Элемент {id} над позицией {target}.',
    'Item {id} is no longer over a drop position.': 'Элемент {id} больше не над позицией для сброса.',
    'Item {id} was dropped at position {target}.': 'Элемент {id} помещён на позицию {target}.',
    'Item {id} was dropped.': 'Элемент {id} помещён.',
    'Dragging of item {id} was cancelled.': 'Перетаскивание элемента {id} отменено.',
    // ── Balancer field hints ────────────────────────────────────────────────
    'Every proxy outbound is named with this prefix, and the balancer selects on it. Change it and the tags in the generated config change with it.':
        'С этим префиксом называется каждый proxy-outbound, и по нему же выбирает балансировщик. Измените его — изменятся и теги в готовом конфиге.',
    'The name of the balancer itself. Routing rules send traffic to this tag instead of to a single outbound.':
        'Имя самого балансировщика. Правила маршрутизации отправляют трафик на этот тег, а не на конкретный outbound.',
    'How the individual node tags are numbered. Cosmetic — pick whatever matches the configs you already run.':
        'Как нумеруются теги отдельных узлов. Чисто косметика — выберите то, что совпадает с вашими текущими конфигами.',
    'How the balancer picks a node for each connection. leastPing and leastLoad need a probe; roundRobin and random do not measure anything.':
        'Как балансировщик выбирает узел для каждого соединения. leastPing и leastLoad требуют проверки, roundRobin и random ничего не измеряют.',
    'Where traffic goes when the balancer has nothing healthy to pick. "None" drops the connection, which surfaces the outage instead of hiding it behind a slow node.':
        'Куда пойдёт трафик, если балансировщику не из чего выбрать. «Нет» обрывает соединение — так авария будет видна, а не спрячется за медленным узлом.',
    'Nodes slower than this are treated as unusable. Too low and the pool empties; too high and a bad node keeps getting traffic.':
        'Узлы медленнее этого значения считаются непригодными. Слишком мало — пул опустеет, слишком много — плохой узел продолжит получать трафик.',
    'How many healthy nodes leastLoad aims to keep in play. Leave at 1 unless you are deliberately spreading load across several.':
        'Сколько здоровых узлов leastLoad старается держать в работе. Оставьте 1, если не разносите нагрузку по нескольким специально.',
    'How node health is measured. burstObservatory pings every node at once and reacts fastest; observatory walks them one at a time and is gentler on the nodes.':
        'Как измеряется состояние узлов. burstObservatory пингует все сразу и реагирует быстрее, observatory обходит их по одному и мягче к узлам.',
    'How often each node is probed. Shorter reacts to an outage sooner and costs more requests from every client running this config.':
        'Как часто проверяется каждый узел. Чаще — быстрее заметите аварию, но и запросов с каждого клиента будет больше.',
    'A probe that takes longer than this counts as a failure. Keep it below the interval.':
        'Проверка дольше этого времени считается неудачной. Держите значение меньше интервала.',
    'How many recent probe results are averaged. More samples smooth out a single bad ping; fewer switch away from a failing node sooner.':
        'Сколько последних результатов усредняется. Больше замеров — сглаживается случайный плохой пинг, меньше — быстрее уход с падающего узла.',
    'The address each node is measured against. It should answer HTTP 204 with an empty body, so the timing reflects the route and not the page.':
        'Адрес, по которому меряется каждый узел. Он должен отвечать HTTP 204 с пустым телом, чтобы замер отражал маршрут, а не загрузку страницы.',
    'These domains get a routing rule straight to the direct outbound, and the same list is repeated in the DNS block so their lookups are answered locally instead of through the proxy.':
        'Для этих доменов создаётся правило маршрутизации прямо в outbound direct, а тот же список повторяется в блоке DNS, чтобы их имена резолвились локально, а не через прокси.',
    'No templates yet — build one on the right and save it, or press New template.':
        'Шаблонов пока нет — соберите шаблон справа и сохраните его либо нажмите «Новый шаблон».',
    'Connect to the panel to see its templates.':
        'Подключитесь к панели, чтобы увидеть её шаблоны.',
    'Saved template': 'Сохранённый шаблон',
    'The template carries no nodes. The panel injects the hosts this selector picks, tagging them {prefix}… so the balancer and probe find them.':
        'Своих узлов у шаблона нет. Панель подставит хосты, которые выберет этот селектор, и пометит их тегами {prefix}… — чтобы балансировщик и проверка их нашли.',
    'Saved. Step 2 below points hosts at it.': 'Сохранено. Шаг 2 ниже направит на него хосты.',
    'Not saved yet — step 2 needs a saved template to point hosts at.':
        'Ещё не сохранено — для шага 2 нужен сохранённый шаблон, на который будут ссылаться хосты.',
    'Will be sent as {tag}': 'Будет отправлено как {tag}',
    'The nodes and the entry host all carry it — that is how the panel knows which hosts to inject':
        'Его несут и узлы, и точка входа — так панель понимает, какие хосты подставлять',
    "They disappear from every subscriber's list and their current tag is replaced by {tag}. Do this once the entry host exists, or this location vanishes for subscribers in between.":
        'Они исчезнут из списка у всех подписчиков, а их текущий тег заменится на {tag}. Делайте это после создания точки входа, иначе локация на время пропадёт у подписчиков.',
    'Confirm: hide and re-tag {n} host|Confirm: hide and re-tag {n} hosts':
        'Подтвердить: скрыть и перетегировать {n} хост|Подтвердить: скрыть и перетегировать {n} хоста|Подтвердить: скрыть и перетегировать {n} хостов',
    'Mark {n} selected host as the pool|Mark {n} selected hosts as the pool':
        'Отметить {n} выбранный хост как пул|Отметить {n} выбранных хоста как пул|Отметить {n} выбранных хостов как пул',
    // ── Strings that used to be template literals ───────────────────────────
    'Delete commit {hash} from history?': 'Удалить коммит {hash} из истории?',
    'Clear all commit history for profile “{name}”?':
        'Очистить всю историю коммитов профиля «{name}»?',
    'Git log — {name} ({count} commits)': 'Журнал Git — {name} ({count} коммитов)',
    'Search in {source} categories...': 'Поиск по категориям {source}...',
    'Copied {n} item|Copied {n} items':
        'Скопирован {n} элемент|Скопировано {n} элемента|Скопировано {n} элементов',
    'Imported {n} node from the JSON subscription|Imported {n} nodes from the JSON subscription':
        'Из JSON-подписки импортирован {n} узел|Из JSON-подписки импортировано {n} узла|Из JSON-подписки импортировано {n} узлов',
    'Imported {n} node|Imported {n} nodes':
        'Импортирован {n} узел|Импортировано {n} узла|Импортировано {n} узлов',
    'Duplicate matcher “{matcher}” is also used in: {rules}':
        'Дубликат условия «{matcher}» используется ещё и в: {rules}',
    'Duplicate IP matcher “{matcher}” is also used in: {rules}':
        'Дубликат IP-условия «{matcher}» используется ещё и в: {rules}',
    '{name} is referenced by this config but is in neither library':
        'На {name} ссылается этот конфиг, но его нет ни в одной библиотеке',
    'Confirm: empty “{name}”': 'Подтвердить: очистить «{name}»',
    '{error} — press Load hosts to retry.': '{error} — нажмите «Загрузить хосты», чтобы повторить.',
    'Will be saved as {tag}': 'Будет сохранено как {tag}',
    'Imported {n} outbound from JSON|Imported {n} outbounds from JSON':
        'Из JSON импортирован {n} outbound|Из JSON импортировано {n} outbound’а|Из JSON импортировано {n} outbound’ов',
    'Imported {n} outbound (chained)|Imported {n} outbounds (chained)':
        'Импортирован {n} outbound (цепочкой)|Импортировано {n} outbound’а (цепочкой)|Импортировано {n} outbound’ов (цепочкой)',
    'Jump to rule #{n}': 'Перейти к правилу №{n}',
    'Delete profile “{name}”?': 'Удалить профиль «{name}»?',
    'Local history timeline ({used}/{limit})': 'Локальная история ({used}/{limit})',
    'Update config ({inbounds} inbounds, {outbounds} outbounds, {rules} rules)':
        'Обновление конфига ({inbounds} inbound, {outbounds} outbound, {rules} правил)',
    'Landed in xray-core commit {commit}, not yet in a tagged release.':
        'Появилось в коммите {commit} xray-core, в релизах пока нет.',
    'Matched by prefix “{prefix}”': 'Совпало по префиксу «{prefix}»',
    'Sorted: {name} first': 'Отсортировано: сначала {name}',
    // ── Snippet form editor ─────────────────────────────────────────────────
    'Add rule': 'Добавить правило',
    'Add balancer': 'Добавить балансировщик',
    'Add outbound': 'Добавить outbound',
    'Entries': 'Записи',
    'Empty — press Add to create the first entry.':
        'Пусто — нажмите «Добавить», чтобы создать первую запись.',
    '(no tag)': '(без тега)',
    'Pick an outbound to open it in the outbound editor — the same one the config uses.':
        'Выберите outbound, чтобы открыть его в том же редакторе, которым правится конфиг.',
    'What does this snippet hold?': 'Что лежит в этом сниппете?',
    'Routing rules': 'Правила маршрутизации',
    'What the panel splices into routing.rules': 'То, что панель вставит в routing.rules',
    'Whole outbounds, spliced into the outbounds array': 'Целые outbound’ы — вставятся в массив outbounds',
    'Balancer definitions for routing.balancers': 'Описания балансировщиков для routing.balancers',
    'Or switch to JSON and paste a body you already have.':
        'Или переключитесь на JSON и вставьте готовое тело.',
    'No templates in this browser yet. Create one to reuse blocks across configs.':
        'В этом браузере пока нет шаблонов. Создайте, чтобы переиспользовать блоки между конфигами.',
    'routing rules': 'правил маршрутизации',
    'outbounds': 'outbound’ов',
    'balancers': 'балансировщиков',
    'mixed contents': 'смешанное содержимое',
    'empty': 'пусто',
    'unrecognised contents': 'нераспознанное содержимое',
    'This body looks like {kind} — inserting it into {target} will not do what you expect.':
        'Похоже, в теле {kind} — вставка этого в {target} сработает не так, как вы ожидаете.',

    // ── Batch editing ───────────────────────────────────────────────────────
    'Batch edit inbounds': 'Пакетное изменение inbound’ов',
    'Batch edit outbounds': 'Пакетное изменение outbound’ов',
    'Nothing to apply': 'Применять нечего',
    'Apply to {n} item|Apply to {n} items':
        'Применить к {n} элементу|Применить к {n} элементам|Применить к {n} элементам',
    'Select all': 'Выбрать все',
    'skip': 'пропуск',
    'Applied to streamSettings.network. Protocols that carry no transport — WireGuard, TUN, freedom, blackhole — are skipped rather than broken.':
        'Записывается в streamSettings.network. Протоколы без транспорта — WireGuard, TUN, freedom, blackhole — пропускаются, а не ломаются.',
    'Leave unchanged': 'Не менять',
    'Tag suffix': 'Суффикс тега',
    'First port': 'Первый порт',
    'Port step': 'Шаг порта',
    'Each further inbound gets the previous port plus this, so a renumbered block does not collide.':
        'Каждый следующий inbound получает предыдущий порт плюс это значение, чтобы перенумерованный блок не конфликтовал сам с собой.',
    'Turn sniffing on': 'Включить sniffing',
    'Enable Mux': 'Включить Mux',
    'Chain through outbound': 'Пустить через outbound',
    'Written to streamSettings.sockopt.dialerProxy. An outbound naming itself is refused: the core will not run a dialer loop.':
        'Записывается в streamSettings.sockopt.dialerProxy. Outbound, указывающий сам на себя, отклоняется: ядро не запустит такую петлю.',
    'What this will change': 'Что именно изменится',
    'Pick the items to change on the left.': 'Выберите слева, что менять.',
    'Set a field above and the exact changes appear here before anything is written.':
        'Задайте поле выше — и здесь появятся точные изменения ещё до записи.',
    'Every selected item already has these values.': 'У всех выбранных элементов уже такие значения.',
    'Edit {n}|Edit {n}': 'Изменить {n}|Изменить {n}|Изменить {n}',
    'Delete {n}|Delete {n}': 'Удалить {n}|Удалить {n}|Удалить {n}',

    // ── Routing shown on an outbound ────────────────────────────────────────
    'Transport-layer routing: matches on addresses and ports, which are always available.':
        'Маршрутизация транспортного уровня: по адресам и портам, которые доступны всегда.',
    'Application-layer routing: matches on domains or protocols, which only exist once the inbound has sniffed the traffic. Without sniffing these rules never match.':
        'Маршрутизация прикладного уровня: по доменам или протоколам, которые появляются только после sniffing на inbound. Без sniffing такие правила не сработают никогда.',
    'Both layers: some rules match on addresses and ports, others need the traffic sniffed first.':
        'Оба уровня: часть правил работает по адресам и портам, части нужен предварительный sniffing.',
    'No routing rule sends traffic here, and it is not the first outbound, so nothing reaches it.':
        'Сюда не ведёт ни одно правило, и это не первый outbound — значит, трафик не дойдёт.',
    'unreachable': 'недостижим',
    'The first outbound: Xray sends it everything no rule matched.':
        'Первый outbound: Xray отправляет туда всё, что не совпало ни с одним правилом.',
    'default': 'по умолчанию',
    'L4+L7': 'L4+L7',
    'Reached through a balancer rather than by name — the rule points at the balancer, which selects this outbound by tag prefix.':
        'Достигается через балансировщик, а не по имени: правило указывает на балансировщик, а тот выбирает этот outbound по префиксу тега.',
    '{n} rule|{n} rules': '{n} правило|{n} правила|{n} правил',

    // ── Client UUID in the balancer builder ─────────────────────────────────
    "No client UUID here: the panel fills in each subscriber's own credentials when it renders this template. Select hosts to say which ones make up the pool.":
        'UUID клиента тут не нужен: собирая шаблон, панель подставит учётные данные каждого подписчика сама. Хосты выбирайте, чтобы задать состав пула.',
    'Client UUID': 'UUID клиента',
    "The id from one user's vless:// link in the panel. It is baked into the config this builds, so that config belongs to that one person — which is why the panel-template mode does not ask for it.":
        'Это id из ссылки vless:// конкретного пользователя в панели. Он зашивается в собираемый конфиг, поэтому такой конфиг принадлежит одному человеку — и поэтому в режиме шаблона панели его не спрашивают.',
    'Needed only by Add, which mirrors hosts into client outbounds.':
        'Нужен только кнопке «Добавить», которая переносит хосты в клиентские outbound’ы.',
    'Add {n}|Add {n}': 'Добавить {n}|Добавить {n}|Добавить {n}',

    // ── shortIds ────────────────────────────────────────────────────────────
    'Generate shortIds': 'Сгенерировать shortId',
    'Added {n} shortId|Added {n} shortIds':
        'Добавлен {n} shortId|Добавлено {n} shortId|Добавлено {n} shortId',
    'Add a generated shortId': 'Добавить сгенерированный shortId',
    'Handshake Target': 'Цель хендшейка',
    'The real TLS server REALITY forwards unrecognised traffic to (domain:port). Setting it is what puts REALITY in server mode. `dest` is the older name for this same field — set one, not both.':
        'Настоящий TLS-сервер, которому REALITY переадресует нераспознанный трафик (домен:порт). Именно его наличие включает серверный режим REALITY. `dest` — старое имя этого же поля: задавайте одно из двух, не оба.',
    'Handshake Target (dest)': 'Цель хендшейка (dest)',
    'The older name for `target`, still accepted by the core. Configs written by panels usually use this one. Set either, not both.':
        'Старое имя поля `target`, ядро его по-прежнему принимает. Конфиги из панелей обычно используют именно его. Задавайте одно из двух, не оба.',
    'client-side fields on a server inbound. Xray never reads them here, so they change nothing. They are shown because they are in your config: clear them if they were copied in by mistake.':
        'клиентские поля на серверном inbound. Xray их здесь не читает, они ни на что не влияют. Показаны потому, что лежат в вашем конфиге: очистите, если попали туда случайно.',
    'server-side fields on a client outbound. Xray never reads them here, so they change nothing. They are shown because they are in your config: clear them if they were copied in by mistake.':
        'серверные поля на клиентском outbound. Xray их здесь не читает, они ни на что не влияют. Показаны потому, что лежат в вашем конфиге: очистите, если попали туда случайно.',
    // ── DNS card ────────────────────────────────────────────────────────────
    'No upstream servers — this DNS block resolves nothing.':
        'Нет вышестоящих серверов — этот блок DNS ничего не резолвит.',
    'A dns outbound exists, but no routing rule sends queries to it, so the DNS block is not in the path.':
        'Outbound dns есть, но ни одно правило не отправляет в него запросы — блок DNS не попадает в путь трафика.',
    'FakeDNS pools are configured, but no inbound sniffs for fakedns — the pools are never used.':
        'Пулы FakeDNS заданы, но ни один inbound не снифает fakedns — пулы не используются.',
    'Query strategy is UseIPv6 while every upstream is reached over IPv4.':
        'Стратегия запросов UseIPv6, хотя все вышестоящие серверы доступны по IPv4.',
    'no upstream servers': 'вышестоящих серверов нет',
    '+{n} more': 'ещё {n}',
    'A server restricted to a domain list only answers for those domains — that is what makes DNS split.':
        'Сервер, ограниченный списком доменов, отвечает только за них — это и есть split-DNS.',
    'A routing rule sends queries to the dns outbound, so the DNS block is actually in the path.':
        'Правило маршрутизации отправляет запросы в outbound dns — значит блок DNS действительно в пути трафика.',
    'routed': 'в маршруте',
    'ECS:': 'ECS:',
    '{n} scoped to domains|{n} scoped to domains':
        '{n} ограничен доменами|{n} ограничены доменами|{n} ограничены доменами',
    '{n} static host|{n} static hosts':
        '{n} статическая запись|{n} статические записи|{n} статических записей',
    'FakeDNS · {n} pool|FakeDNS · {n} pools':
        'FakeDNS · {n} пул|FakeDNS · {n} пула|FakeDNS · {n} пулов',

    // ── REALITY key naming ──────────────────────────────────────────────────
    'Server Public Key': 'Публичный ключ сервера',
    "The server's REALITY public key (x25519) — the half that pairs with its private key. Newer xray-core renamed the field from `publicKey` to `password`; it is not a passphrase and there is nothing to invent here. Set this or `publicKey`, not both.":
        'Публичный ключ REALITY сервера (x25519) — половина пары к его приватному ключу. В свежих xray-core поле переименовали из `publicKey` в `password`; это не пароль, придумывать тут нечего. Задавайте это поле или `publicKey`, не оба.',
    'Server Public Key (publicKey)': 'Публичный ключ сервера (publicKey)',
    'The older name for `password`, still accepted by the core. Links and configs written before the rename use this one. Set either, not both.':
        'Старое имя поля `password`, ядро его по-прежнему принимает. Ссылки и конфиги, созданные до переименования, используют именно его. Задавайте одно из двух, не оба.',

    // ── shortId / spiderX generation ────────────────────────────────────────
    'How many': 'Сколько',
    'appended to the list below': 'добавятся в список ниже',
    '{n} already in the list|{n} already in the list':
        '{n} уже в списке|{n} уже в списке|{n} уже в списке',
    'Generate a spiderX path': 'Сгенерировать путь spiderX',

    // ── spiderX path list ───────────────────────────────────────────────────
    'SpiderX Paths': 'Пути SpiderX',
    'spiderX is walked on the target site itself, so a path that site really serves is the only kind that does not 404. Paste a sitemap, a HAR export, the page\'s HTML, or just a list of paths — whatever is in there gets read.':
        'По spiderX клиент ходит на самом сайте-цели, поэтому не отдаст 404 только тот путь, который у цели действительно есть. Вставьте sitemap, выгрузку HAR, HTML страницы или просто список путей — разберётся всё, что там лежит.',
    'Absolute URLs from other hosts are dropped: their paths live on someone else\'s server. Query strings are dropped too — xray-core reads the spider\'s own tuning out of spiderX\'s query, so they are not decoration.':
        'Абсолютные ссылки на чужие хосты отбрасываются: их пути лежат на чужом сервере. Query-строки тоже — xray-core вычитывает из query у spiderX собственные настройки паука, так что это не украшение.',
    'Read paths': 'Разобрать пути',
    'No paths found in that text.': 'В этом тексте путей не нашлось.',
    'Every path in there is already on the list.': 'Все пути оттуда уже в списке.',
    'Until there is a list here, the dice builds a plausible-looking path instead.':
        'Пока список пуст, кубик собирает правдоподобный путь сам.',
    'New paths are appended; the ones already stored are kept.':
        'Новые пути добавляются к сохранённым, старые остаются.',
    'Added {n} path|Added {n} paths':
        'Добавлен {n} путь|Добавлено {n} пути|Добавлено {n} путей',
    '{n} path · the dice uses it|{n} paths · the dice uses them':
        '{n} путь · кубик берёт его|{n} пути · кубик берёт из них|{n} путей · кубик берёт из них',
    'Take a path from your list ({n})': 'Взять путь из вашего списка ({n})',

    // ── Мобильная навигация внутри редакторов ───────────────────────────────
    'Back to the index': 'Назад к списку',

    // ── Резервная копия всего состояния ─────────────────────────────────────
    'Backup & Restore': 'Резервная копия',
    'Downloading a config exports that config alone. This exports everything the editor remembers — profiles, version history, panel connection, libraries and settings — as one file.':
        'Скачивание конфига выгружает только сам конфиг. Здесь выгружается всё, что помнит редактор: профили, история версий, подключение к панели, библиотеки и настройки — одним файлом.',
    'Export everything': 'Выгрузить всё',
    'Import a backup': 'Загрузить копию',
    'There is nothing stored yet to export.': 'Выгружать пока нечего — ничего не сохранено.',
    'That file is not JSON.': 'Это не JSON.',
    'That is a JSON file, but not a backup of this editor. A single config goes in through Open, not here.':
        'Это JSON, но не копия этого редактора. Отдельный конфиг открывается кнопкой «Открыть», а не здесь.',
    'That backup was written by a newer version of the editor. Update first, then import it.':
        'Эту копию записала более новая версия редактора. Сначала обновитесь, потом загружайте.',
    'That backup has no state in it.': 'В этой копии нет состояния.',
    'Importing replaces everything currently in this browser. Export first if you have not.':
        'Загрузка заменит всё, что сейчас лежит в этом браузере. Если ещё не выгружали — выгрузите сначала.',
    'panel connection': 'подключение к панели',
    'Replace and reload': 'Заменить и перезагрузить',
    'On iOS, an app added to the home screen gets its own storage — it will not see anything saved here in Safari. Export first, install through Share → Add to Home Screen, then import inside the installed app.':
        'На iOS у приложения с домашнего экрана своё собственное хранилище — оно не увидит ничего из того, что сохранено здесь, в Safari. Сначала выгрузите, потом установите через «Поделиться» → «На экран „Домой“», и уже внутри установленного приложения загрузите копию.',
    'Exported {n} profile|Exported {n} profiles':
        'Выгружен {n} профиль|Выгружено {n} профиля|Выгружено {n} профилей',
    '{n} profile|{n} profiles': '{n} профиль|{n} профиля|{n} профилей',
    '{n} snapshot|{n} snapshots': '{n} снимок|{n} снимка|{n} снимков',
    '{n} spiderX path|{n} spiderX paths': '{n} путь spiderX|{n} пути spiderX|{n} путей spiderX',

    // ── Обновление установленного приложения ────────────────────────────────
    'A new version is ready.': 'Готова новая версия.',
    'Reloading applies it. Anything unsaved in the editor is lost, so finish what you are doing first.':
        'Она применится после перезагрузки. Несохранённое в редакторе при этом потеряется — сначала доделайте начатое.',
    'Reload': 'Перезагрузить',

    // ── Нижняя панель действий на телефоне ──────────────────────────────────
    'Open': 'Открыть',
    'Local File': 'Локальный файл',

    // ── Диффы, которые слишком велики ───────────────────────────────────────
    'This change is too large to diff': 'Это изменение слишком велико для диффа',
    'Lining up two configs that differ this much takes longer than it is worth. The commit is intact — restore it or open its JSON to see the whole thing.':
        'Выравнивать два настолько разных конфига дольше, чем это того стоит. Коммит цел: восстановите его или откройте JSON, чтобы увидеть всё целиком.',
    'Cloud': 'Облако',
    'About': 'О нас',

    // ── Установка приложения и диагностика ──────────────────────────────────
    'Install as an app': 'Установка приложения',
    'Installed, the editor opens in its own window, works offline and keeps its own storage. Export your data first — an installed app does not inherit what the browser tab saved.':
        'Установленный редактор открывается в своём окне, работает офлайн и держит собственное хранилище. Сначала выгрузите данные: установленное приложение не наследует то, что сохранила вкладка браузера.',
    'Install': 'Установить',
    'Check why it cannot be installed': 'Проверить, почему не ставится',
    'Running as an installed app.': 'Запущено как установленное приложение.',
    'The browser has not offered an install for this page.':
        'Браузер не предлагал установку для этой страницы.',
    'Install dismissed.': 'Установка отклонена.',
    'This is what fails:': 'Вот что не проходит:',
    'Everything checks out and the browser has offered an install.':
        'Всё сходится, и браузер предложил установку.',
    'Everything this page can check passes. If the browser still refuses, it is holding an older copy — reload once or twice — or it is Safari, which installs only through Share → Add to Home Screen.':
        'Всё, что можно проверить со страницы, проходит. Если браузер всё равно отказывает — он держит старую копию (перезагрузите раз-другой) — либо это Safari, где установка идёт только через «Поделиться» → «На экран „Домой“».',
    'Served over HTTPS': 'Отдаётся по HTTPS',
    'The page links a manifest': 'На странице есть ссылка на манифест',
    'The manifest loads': 'Манифест загружается',
    'The manifest has a name': 'В манифесте есть имя',
    'It asks for its own window': 'Запрошено собственное окно',
    "The start page is inside the app's scope": 'Стартовая страница внутри области приложения',
    'An icon of at least 192px is declared': 'Объявлена иконка не меньше 192px',
    'Every declared icon actually loads': 'Каждая объявленная иконка действительно грузится',
    'A service worker is installed': 'Service worker установлен',
    'The service worker controls this page': 'Service worker контролирует эту страницу',
    'The server sends it, but something in this browser removed it — put back.':
        'Сервер его отдаёт, но что-то в этом браузере его убрало — поставили обратно.',
    'The page as served has no manifest link — put back.':
        'В отданной странице ссылки на манифест нет — поставили обратно.',
    'It was missing — put back.': 'Его не было — поставили обратно.',
    'It is missing and could not be added.': 'Его нет, и добавить не получилось.',
};
