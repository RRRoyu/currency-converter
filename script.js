document.addEventListener('DOMContentLoaded', () => {
    // --- 配置区 ---
    const API_KEY = '412dcc822811181a00e03df2'; // <--- 在这里替换成你自己的API KEY
    const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
    const defaultCurrencies = ['CNY', 'JPY', 'USD', 'EUR', 'KRW'];

    // --- DOM 元素 ---
    const currencyRowsContainer = document.querySelector('.currency-rows');
    const lastUpdatedElement = document.getElementById('last-updated');

    let rates = {};
    let currencyInputs = {};

    // --- 主函数 ---
    async function init() {
        createCurrencyRows();
        const data = await fetchRates();
        if (data) {
            rates = data.conversion_rates;
            updateLastUpdatedTime(data.time_last_update_unix);
            setupEventListeners();
            // 初始设置美元为1，并触发计算
            currencyInputs['USD'].value = 1;
            currencyInputs['USD'].dispatchEvent(new Event('input'));
        } else {
            lastUpdatedElement.textContent = "汇率加载失败，请检查API Key或网络连接。";
        }
    }

    // --- 功能函数 ---

    // 1. 创建UI界面
    function createCurrencyRows() {
        defaultCurrencies.forEach(currency => {
            const row = document.createElement('div');
            row.className = 'currency-row';
            
            row.innerHTML = `
                <span class="currency-code">${currency}</span>
                <input type="number" class="currency-input" data-currency="${currency}" placeholder="0.00">
                <button class="reset-btn" data-currency="${currency}">重置</button>
            `;
            
            currencyRowsContainer.appendChild(row);
        });
        // 存储所有input元素的引用
        document.querySelectorAll('.currency-input').forEach(input => {
            currencyInputs[input.dataset.currency] = input;
        });
    }

    // 2. 获取汇率 (带缓存逻辑)
    async function fetchRates() {
        const cacheKey = 'currency_cache';
        const cachedData = JSON.parse(localStorage.getItem(cacheKey));
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000; // 1小时的毫秒数

        // 如果有缓存，并且缓存未超过1小时，则使用缓存
        if (cachedData && (now - cachedData.timestamp < oneHour)) {
            console.log("Using cached rates.");
            return cachedData.data;
        }

        // 否则，重新请求API
        try {
            console.log("Fetching new rates from API.");
            const response = await fetch(BASE_URL);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            if (data.result === 'success') {
                // 存入缓存
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: now,
                    data: data
                }));
                return data;
            } else {
                throw new Error('API request failed: ' + data['error-type']);
            }

        } catch (error) {
            console.error('Fetch error:', error);
            // 如果API请求失败，但有旧缓存，依然可以使用旧缓存
            return cachedData ? cachedData.data : null;
        }
    }

    // 3. 更新 "最后更新时间" 的显示
    function updateLastUpdatedTime(unixTimestamp) {
        const date = new Date(unixTimestamp * 1000);
        lastUpdatedElement.textContent = `最后更新时间: ${date.toLocaleString()}`;
    }

    // 4. 设置事件监听器
    function setupEventListeners() {
        Object.values(currencyInputs).forEach(input => {
            input.addEventListener('input', handleInputChange);
        });

        document.querySelectorAll('.reset-btn').forEach(button => {
            button.addEventListener('click', handleResetClick);
        });
    }

    // 5. 处理输入变化事件
    function handleInputChange(e) {
        const sourceInput = e.target;
        const sourceCurrency = sourceInput.dataset.currency;
        const sourceValue = parseFloat(sourceInput.value);

        if (isNaN(sourceValue) || sourceValue === 0) {
            // 如果输入无效或为0，清空所有其他输入框
            Object.values(currencyInputs).forEach(input => {
                if (input !== sourceInput) {
                    input.value = '';
                }
            });
            return;
        }

        // 核心转换逻辑
        // 1. 先将输入金额统一转换为基础货币(USD)
        const valueInUsd = sourceValue / rates[sourceCurrency];

        // 2. 再从USD转换到其他所有货币
        Object.entries(currencyInputs).forEach(([currency, input]) => {
            if (currency !== sourceCurrency) {
                const convertedValue = valueInUsd * rates[currency];
                // 使用 toFixed(4) 保留4位小数，并用 parseFloat 去掉末尾多余的0
                input.value = parseFloat(convertedValue.toFixed(4));
            }
        });
    }

    // 6. 处理重置按钮点击事件
    function handleResetClick(e) {
        const currencyToReset = e.target.dataset.currency;
        const inputToReset = currencyInputs[currencyToReset];
        
        inputToReset.value = 1;
        // 手动触发 input 事件来更新其他所有货币的金额
        inputToReset.dispatchEvent(new Event('input'));
    }

    // --- 启动应用 ---
    init();
});