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
    'RAW Socket Settings': 'Настройки RAW-сокета',
    'Used primarily with Finalmask for obfuscation.':
        'В основном используется вместе с Finalmask для обфускации.',
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
    'Header Type': 'Тип заголовка',
    'Seed': 'Seed',
    'password': 'пароль',
    'TTI (ms)': 'TTI (мс)',
    'Uplink Capacity (MB/s)': 'Пропускная способность вверх (МБ/с)',
    'Downlink Capacity (MB/s)': 'Пропускная способность вниз (МБ/с)',
    'Read Buffer Size (MB)': 'Размер буфера чтения (МБ)',
    'Write Buffer Size (MB)': 'Размер буфера записи (МБ)',
    'QUIC Settings': 'Настройки QUIC',
    'Key': 'Ключ',
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
    'INVALID JSON': 'НЕВЕРНЫЙ JSON',
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
    'UseIP will force Xray to resolve the domain before matching.':
        'UseIP заставит Xray сначала разрешить домен, а потом сопоставлять.',
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
    'Bandwidth & Global Settings': 'Скорость и общие настройки',
    'Maximum upload speed in Mbps for Hysteria 2 protocol.':
        'Максимальная скорость отдачи в Мбит/с для Hysteria 2.',
    'Maximum download speed in Mbps for Hysteria 2 protocol.':
        'Максимальная скорость загрузки в Мбит/с для Hysteria 2.',
    'Ignore Client Bandwidth': 'Игнорировать скорость клиента',
    'If enabled, the server will ignore the bandwidth limits requested by the client.':
        'Если включено, сервер не будет учитывать ограничения скорости, запрошенные клиентом.',
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
    'ForceIP: query DNS locally and use IP. UseIP: resolve IP through system.':
        'ForceIP — резолвить DNS локально и работать по IP. UseIP — получать IP через систему.',
    'Workers': 'Воркеры',
    'Number of concurrent workers. Default is CPU core count.':
        'Сколько воркеров работает параллельно. По умолчанию — по числу ядер.',
    'Remote DNS': 'Удалённый DNS',
    "DNS server(s) resolved through the WireGuard tunnel itself (not Xray's DNS module) — comma-separated. Useful when the peer's network only resolves internal names.":
        'DNS-серверы, которые резолвятся через сам туннель WireGuard, а не через DNS-модуль Xray; перечисляются через запятую. Нужно, когда сеть пира отдаёт только внутренние имена.',
    'Outbound profile generated successfully': 'Профиль outbound создан',
    'Generation failed': 'Не удалось сгенерировать',
    'Generate WARP(WG) Outbound': 'Сгенерировать WARP-outbound (WireGuard)',
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
    'Listen IP (0.0.0.0)': 'IP прослушивания (0.0.0.0)',
    'Experimental. Controls BBR/Brutal congestion and limits.':
        'Экспериментально. Управляет контролем перегрузки BBR/Brutal и лимитами.',
    'Max Idle Timeout': 'Макс. время простоя',
    'Handshake Timeout': 'Таймаут рукопожатия',
    'Congestion Control': 'Контроль перегрузки',
    'Brutal Up (Mbps)': 'Brutal вверх (Мбит/с)',

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
    'How to resolve domain names when connecting.':
        'Как разрешать доменные имена при подключении.',
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
    'Direct (None)': 'Напрямую (без цепочки)',
    'When enabled, proxy chaining occurs at the transport layer instead of the application layer.':
        'Если включено, цепочка прокси строится на транспортном уровне, а не на прикладном.',
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
    'Save & Close': 'Сохранить и закрыть',
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
    'Log & API': 'Логи и API',
    'Policy': 'Политики',
    'General Settings': 'Общие настройки',
    'Core Compatibility & Generators': 'Совместимость с ядром и генераторы',
    'Target Xray-core Version': 'Целевая версия Xray-core',
    'Adjusts UI fields and validation based on core features.':
        'Подстраивает поля интерфейса и проверки под возможности этой версии ядра.',
    'WARP Worker URL': 'URL воркера WARP',
    'Optional: Your private Cloudflare Worker URL for CORS-safe registration.':
        'Необязательно: адрес вашего Cloudflare Worker для регистрации без проблем с CORS.',
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
    'Rotates or dynamically allocates listen ports across a specified range for anti-censorship port hopping.':
        'Меняет или динамически выделяет порты прослушивания в заданном диапазоне — приём против блокировок.',
    'Dynamically open random port listeners from the port range.':
        'Динамически открывать случайные порты из диапазона.',
    'Refresh Interval': 'Интервал обновления',
    'Interval to rotate random ports.': 'Как часто меняются случайные порты.',
    'Concurrency': 'Параллельность',
    'Number of concurrent random ports to listen on.':
        'Сколько случайных портов слушать одновременно.',
    'Traffic Sniffing': 'Sniffing трафика',
    'Enable Sniffing': 'Включить sniffing',
    'Analyze traffic to determine destination domain and protocol.':
        'Разбирает трафик, чтобы определить домен назначения и протокол.',
    'Inbound Editor': 'Редактор inbound',
    'Extended Inbound Settings': 'Расширенные настройки inbound',
    'Port hopping/rotation (allocate) and advanced listener options.':
        'Смена портов (allocate) и продвинутые параметры прослушивания.',
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
    'Web spider crawl path to authenticate handshake.':
        'Путь обхода, по которому подтверждается рукопожатие.',
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
    'Base64 SHA-256 hash for strict certificate pinning.':
        'Хеш SHA-256 в base64 для строгого пиннинга сертификата.',
    'Base64 hash string': 'Строка хеша в base64',
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
    'Standard HTTP proxying': 'Обычное HTTP-проксирование',
    'UDP-based transport (HTTP/3)': 'Транспорт поверх UDP (HTTP/3)',
    'Aggressive UDP transport': 'Агрессивный UDP-транспорт',
    'Raw socket access': 'Прямой доступ к сокету',
    'Modern WebSocket alternative': 'Современная альтернатива WebSocket',
    'Plaintext (unsafe)': 'Без шифрования (небезопасно)',
    'Standard SSL/TLS encryption': 'Обычное шифрование SSL/TLS',
    'Next-gen stealth encryption': 'Скрытное шифрование нового поколения',
    'No obfuscation': 'Без обфускации',
    'Simulate HTTP request': 'Имитировать HTTP-запрос',
    'Video call simulation': 'Имитация видеозвонка',
    'BitTorrent simulation': 'Имитация BitTorrent',
    'WeChat video call': 'Видеозвонок WeChat',
    'DTLS 1.2 simulation': 'Имитация DTLS 1.2',
    'WireGuard simulation': 'Имитация WireGuard',

    // ── Routing rule fields ─────────────────────────────────────────────────
    'Outbound': 'Outbound',
    'Load Balancer': 'Балансировщик',
    'Default (Inherit)': 'По умолчанию (наследовать)',
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
    'Local OS (Experimental)': 'Локальная ОС (экспериментально)',
    'Matches the OS the Xray process runs on (e.g. windows, linux, darwin). Landed on xray-core main 2026-08-12 (commit a12801c1) — not in a tagged release yet.':
        'Сопоставляет ОС, в которой работает процесс Xray (windows, linux, darwin). Появилось в main xray-core 12.08.2026 (коммит a12801c1) — в релизах пока нет.',
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
    'As Is': 'Как есть',
    'Use system DNS': 'Использовать системный DNS',
    'Use IP': 'По IP',
    'Resolve via Xray DNS': 'Разрешать через DNS-модуль Xray',
    'Use IPv4': 'По IPv4',
    'Use IPv6': 'По IPv6',
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
    'Same (Reuse)': 'Тот же (переиспользовать)',
    'Different': 'Другой',
    'Highest compatibility': 'Максимальная совместимость',
    'Full duplex (Fast)': 'Полный дуплекс (быстро)',
    'Single request': 'Один запрос',
    'Force Brutal': 'Принудительно Brutal',

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
    'Always (Fixed List)': 'Всегда (фиксированный список)',
    'Allocates all random ports continuously':
        'Постоянно держит открытыми все случайные порты',
    'Random Rotation': 'Случайная смена',
    'Randomly cycles ports on refresh interval':
        'Случайно меняет порты с заданным интервалом',
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
    'Latest (v1.8.10+)': 'Последняя (v1.8.10+)',
    'Stable (v1.8.0)': 'Стабильная (v1.8.0)',
    'Legacy (v1.5.0)': 'Устаревшая (v1.5.0)',
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
};
