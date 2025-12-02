document.addEventListener('DOMContentLoaded', () => {
    // --- 配置区 ---
    const API_KEY = '412dcc822811181a00e03df2'; // <--- 再次确认这里已替换成你自己的API KEY
    const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
    const defaultCurrencies = ['CNY', 'JPY', 'USD', 'EUR', 'KRW'];

    // 常用货币中文名称映射
    const currencyMap = {
        'CNY': '人民币', 'USD': '美元', 'EUR': '欧元', 'JPY': '日元', 'KRW': '韩元',
        'HKD': '港币', 'GBP': '英镑', 'AUD': '澳元', 'CAD': '加元', 'SGD': '新元',
        'CHF': '瑞郎', 'NZD': '新西兰元', 'TWD': '新台币', 'MOP': '澳门元', 'THB': '泰铢'
    };

    // --- DOM 元素 ---
    const currencyRowsContainer = document.querySelector('.currency-rows');
    const lastUpdatedElement = document.getElementById('last-updated');

    let rates = {};
    let activeCurrencyElements = {}; // 存储每行的元素引用

    // --- 主函数 ---
    async function init() {
        createCurrencyRows();
        const data = await fetchRates();
        if (data) {
            rates = data.conversion_rates;
            updateLastUpdatedTime(data.time_last_update_unix);
            setupEventListeners();
            // 初始设置美元为1，并触发计算
            const usdInput = document.querySelector('.currency-input[data-currency="USD"]');
            if (usdInput) {
                usdInput.value = 1;
                usdInput.dispatchEvent(new Event('input'));
            }
        } else {
            lastUpdatedElement.textContent = "汇率加载失败，请检查API Key或网络连接。";
        }
    }

    // --- 功能函数 ---

    // 1. 创建UI界面
    function createCurrencyRows() {
        defaultCurrencies.forEach((currency, index) => {
            const row = document.createElement('div');
            row.className = 'currency-row';
            row.dataset.rowIndex = index; // 给每一行一个唯一标识

            // 创建下拉选择框
            const select = document.createElement('select');
            select.className = 'currency-select';
            for (const code in currencyMap) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `${currencyMap[code]} (${code})`;
                if (code === currency) {
                    option.selected = true;
                }
                select.appendChild(option);
            }

            row.innerHTML = `
                <div class="currency-selector">
                    ${select.outerHTML}
                </div>
                <input type="number" class="currency-input" data-currency="${currency}" placeholder="0.00">
                <button class="reset-btn" data-currency="${currency}">重置</button>
            `;
            
            currencyRowsContainer.appendChild(row);

            // 存储该行所有元素的引用
            activeCurrencyElements[index] = {
                select: row.querySelector('.currency-select'),
                input: row.querySelector('.currency-input'),
                resetBtn: row.querySelector('.reset-btn')
            };
        });
    }

    // 2. 获取汇率 (带缓存逻辑) - 无改动
    async function fetchRates() {
        const cacheKey = 'currency_cache';
        const cachedData = JSON.parse(localStorage.getItem(cacheKey));
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;

        if (cachedData && (now - cachedData.timestamp < oneHour)) {
            console.log("Using cached rates.");
            return cachedData.data;
        }

        try {
            console.log("Fetching new rates from API.");
            const response = await fetch(BASE_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data.result === 'success') {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data: data }));
                return data;
            } else {
                throw new Error('API request failed: ' + data['error-type']);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            return cachedData ? cachedData.data : null;
        }
    }

    // 3. 更新 "最后更新时间" 的显示 (改为北京时间)
    function updateLastUpdatedTime(unixTimestamp) {
        const date = new Date(unixTimestamp * 1000);
        const beijingTime = date.toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            hour12: false
        });
        lastUpdatedElement.textContent = `最后更新时间: ${beijingTime} (北京时间)`;
    }

    // 4. 设置事件监听器
    function setupEventListeners() {
        document.querySelectorAll('.currency-row').forEach(row => {
            const rowIndex = row.dataset.rowIndex;
            const elements = activeCurrencyElements[rowIndex];

            elements.input.addEventListener('input', handleInputChange);
            elements.resetBtn.addEventListener('click', handleResetClick);
            elements.select.addEventListener('change', handleCurrencyChange);
        });
    }

    // 5. 处理输入变化事件
    function handleInputChange(e) {
        const sourceInput = e.target;
        const sourceCurrency = sourceInput.dataset.currency;
        const sourceValue = parseFloat(sourceInput.value);

        if (isNaN(sourceValue) || !rates[sourceCurrency]) {
            clearOtherInputs(sourceInput);
            return;
        }

        const valueInUsd = sourceValue / rates[sourceCurrency];

        Object.values(activeCurrencyElements).forEach(({ input }) => {
            if (input !== sourceInput) {
                const targetCurrency = input.dataset.currency;
                if (rates[targetCurrency]) {
                    const convertedValue = valueInUsd * rates[targetCurrency];
                    input.value = parseFloat(convertedValue.toFixed(4));
                }
            }
        });
    }
    
    function clearOtherInputs(sourceInput) {
         Object.values(activeCurrencyElements).forEach(({ input }) => {
            if (input !== sourceInput) {
                input.value = '';
            }
        });
    }


    // 6. 处理重置按钮点击事件
    function handleResetClick(e) {
        const currency = e.target.dataset.currency;
        const inputToReset = document.querySelector(`.currency-input[data-currency="${currency}"]`);
        if (inputToReset) {
            inputToReset.value = 1;
            inputToReset.dispatchEvent(new Event('input'));
        }
    }
    
    // 7. 新增：处理货币切换事件
    function handleCurrencyChange(e) {
        const select = e.target;
        const newCurrency = select.value;
        const row = select.closest('.currency-row');
        const rowIndex = row.dataset.rowIndex;
        const elements = activeCurrencyElements[rowIndex];

        // 更新关联元素的 data-currency 属性
        elements.input.dataset.currency = newCurrency;
        elements.resetBtn.dataset.currency = newCurrency;
        
        // 找到一个有值的输入框来重新计算
        let referenceInput = null;
        for (const key in activeCurrencyElements) {
            const el = activeCurrencyElements[key].input;
            if (el.value && !isNaN(parseFloat(el.value))) {
                referenceInput = el;
                break;
            }
        }

        // 如果找到了，就触发它的input事件来更新所有行
        if (referenceInput) {
            referenceInput.dispatchEvent(new Event('input'));
        }
    }


    // --- 启动应用 ---
    init();
});