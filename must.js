        // DOM Elements
        const canvas = document.getElementById('waveformChart');
        const startStopBtn = document.getElementById('startStopBtn');
        const resetBtn = document.getElementById('resetBtn');
        const yScaleUpBtn = document.getElementById('yScaleUp');
        const yScaleDownBtn = document.getElementById('yScaleDown');
        const xScaleUpBtn = document.getElementById('xScaleUp');
        const xScaleDownBtn = document.getElementById('xScaleDown');
        const yScaleValueSpan = document.getElementById('yScaleValue');
        const xScaleValueSpan = document.getElementById('xScaleValue');

        // Chart and Data State
        let chart;
        let dataInterval;
        let isRunning = false;
        let currentTime = 0;
        const DATA_INTERVAL_MS = 500;

        let yAxisMax = 100;
        let xAxisWindowSeconds = 10;

        let latestForwardCurrent = 0;
        let latestForwardVolt = 0;
        let latestForwardWatt = 0;

        // Datasets for Voltage, Current, and Power
        const datasets = {
            voltage: {
                label: '전압 (V)',
                borderColor: 'rgb(56, 189, 248)', // sky-400
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                data: [],
                tension: 0.4,
                borderWidth: 2,
            },
            current: {
                label: '전류 (A)',
                borderColor: 'rgb(239, 68, 68)', // red-500
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                data: [],
                tension: 0.4,
                borderWidth: 2,
            },
            power: {
                label: '전력 (W)',
                borderColor: 'rgb(74, 222, 128)', // green-400
                backgroundColor: 'rgba(74, 222, 128, 0.2)',
                data: [],
                tension: 0.4,
                borderWidth: 2,
            }
        };

        // --- Chart Initialization ---
        function initializeChart() {
            const ctx = canvas.getContext('2d');
            if (chart) {
                chart.destroy();
            }
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [datasets.voltage, datasets.current, datasets.power]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false, // Disable animation for real-time feel
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: {
                                display: true,
                                text: '시간 (ms)',
                                color: '#9ca3af'
                            },
                            ticks: {
                                color: '#9ca3af'
                            },
                            grid: {
                                color: '#4b5563'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '값',
                                color: '#9ca3af'
                            },
                            min: -yAxisMax,
                            max: yAxisMax,
                            ticks: {
                                color: '#9ca3af'
                            },
                             grid: {
                                color: '#4b5563'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#d1d5db'
                            }
                        },
                        tooltip: {
                            enabled: true,
                        }
                    }
                }
            });
        }

        // --- Data Generation and Update ---
        function addDataPoint() {
            if (!isRunning) return;

            // Generate random values
            const voltage = latestForwardVolt;
            const current = latestForwardCurrent;

            const power = latestForwardWatt;

            // Add new data
            datasets.voltage.data.push({ x: currentTime, y: voltage });
            datasets.current.data.push({ x: currentTime, y: current });
            datasets.power.data.push({ x: currentTime, y: power });
            
            // Slide the X-axis window
            const windowMs = xAxisWindowSeconds * 1000;
            chart.options.scales.x.min = Math.max(0, currentTime - windowMs);
            chart.options.scales.x.max = currentTime;

            // Remove old data that is outside the window to save memory
            const cutoffTime = currentTime - windowMs * 1.5; // Keep a small buffer
            datasets.voltage.data = datasets.voltage.data.filter(d => d.x >= cutoffTime);
            datasets.current.data = datasets.current.data.filter(d => d.x >= cutoffTime);
            datasets.power.data = datasets.power.data.filter(d => d.x >= cutoffTime);

            chart.update();
            currentTime += DATA_INTERVAL_MS;
        }

        // --- Control Functions ---
        function toggleStartStop() {
            isRunning = !isRunning;
            if (isRunning) {
                startStopBtn.textContent = '정지';
                startStopBtn.classList.remove('bg-cyan-500', 'hover:bg-cyan-600');
                startStopBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
                dataInterval = setInterval(addDataPoint, DATA_INTERVAL_MS);
            } else {
                startStopBtn.textContent = '시작';
                startStopBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
                startStopBtn.classList.add('bg-cyan-500', 'hover:bg-cyan-600');
                clearInterval(dataInterval);
            }
        }

        function resetChart() {
            // Stop the interval if it's running
            if (isRunning) {
                toggleStartStop();
            }
            // Clear data
            datasets.voltage.data = [];
            datasets.current.data = [];
            datasets.power.data = [];
            currentTime = 0;

            // Reset scales to default
            yAxisMax = 100;
            xAxisWindowSeconds = 10;
            updateScaleDisplays();
            
            // Re-initialize chart to apply resets
            initializeChart();
        }

        function updateYScale() {
            chart.options.scales.y.min = -yAxisMax;
            chart.options.scales.y.max = yAxisMax;
            yScaleValueSpan.textContent = yAxisMax;
            chart.update();
        }

        function updateXScale() {
            xScaleValueSpan.textContent = `${xAxisWindowSeconds}s`;
            // The actual scale update happens in addDataPoint as the window slides
        }

        function updateScaleDisplays() {
            yScaleValueSpan.textContent = yAxisMax;
            xScaleValueSpan.textContent = `${xAxisWindowSeconds}s`;
        }

        // --- Event Listeners ---
        startStopBtn.addEventListener('click', toggleStartStop);
        resetBtn.addEventListener('click', resetChart);

        yScaleUpBtn.addEventListener('click', () => {
            yAxisMax = Math.min(1000, yAxisMax + 25);
            updateYScale();
        });
        yScaleDownBtn.addEventListener('click', () => {
            yAxisMax = Math.max(25, yAxisMax - 25);
            updateYScale();
        });

        xScaleUpBtn.addEventListener('click', () => {
            xAxisWindowSeconds = Math.min(60, xAxisWindowSeconds + 5);
            updateXScale();
        });
        xScaleDownBtn.addEventListener('click', () => {
            xAxisWindowSeconds = Math.max(5, xAxisWindowSeconds - 5);
            updateXScale();
        });

        // --- Initial Load ---
        window.onload = () => {
            initializeChart();
        };

        