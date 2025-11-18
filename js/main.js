// Main Dashboard Initialization and Coordination

// Global state
let globalData = null;
let interactionMode = 'hover'; // 'hover' or 'select'
let selectedRegions = [];

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load positions first
        await loadPositions();

        // Load data
        globalData = await d3.json('data/mock-education-data.json');

        // Initialize all panels
        initializeDashboard();

        // Add interaction controls
        addGlobalControls();

        // Add accessibility features
        addAccessibilityFeatures();

        console.log('Dashboard initialized successfully');
        console.log('Press D to toggle drag mode, S to save positions');
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load education data. Please check the data file.');
    }
});

// Initialize all four panels
const initializeDashboard = () => {
    // Panel 1: Learning Poverty
    createLearningPovertyPanel(
        globalData,
        '#panel1 .panel-content'
    );

    // Panel 2: Access vs Completion
    createAccessCompletionPanel(
        globalData,
        '#panel2 .panel-content'
    );

    // Panel 3: Spending Efficiency
    createSpendingEfficiencyPanel(
        globalData,
        '#panel3 .panel-content'
    );

    // Panel 4: Equity Analysis
    createEquityAnalysisPanel(
        globalData,
        '#panel4 .panel-content'
    );

    // Add entrance animation
    setTimeout(() => {
        document.querySelectorAll('.panel').forEach((panel, i) => {
            setTimeout(() => {
                panel.classList.add('entering');
            }, i * 100);
        });
    }, 100);

    // Add click handlers for comparison mode
    addComparisonClickHandlers();
};

// Add click handlers for region selection in compare mode
const addComparisonClickHandlers = () => {
    d3.selectAll('.selectable').on('click', function(event, d) {
        if (interactionMode !== 'select' || !d || !d.id) return;

        event.stopPropagation();
        toggleRegionSelection(d.id, d);
    });
};

// Toggle region selection
const toggleRegionSelection = (regionId, regionData) => {
    const index = selectedRegions.findIndex(r => r.id === regionId);

    if (index >= 0) {
        // Deselect
        selectedRegions.splice(index, 1);
    } else {
        // Select (max 4 regions)
        if (selectedRegions.length >= 4) {
            alert('Maximum 4 regions can be compared at once. Deselect one first.');
            return;
        }
        selectedRegions.push(regionData);
    }

    updateSelectionVisuals();
    updateComparisonPanel();
};

// Update visual indication of selected regions
const updateSelectionVisuals = () => {
    d3.selectAll('.selectable').each(function(d) {
        if (!d || !d.id) return;

        const isSelected = selectedRegions.some(r => r.id === d.id);
        d3.select(this)
            .classed('selected-for-comparison', isSelected)
            .style('stroke', isSelected ? '#FF6B35' : null)
            .style('stroke-width', isSelected ? '4px' : null);
    });
};

// Create comparison panel
const createComparisonPanel = () => {
    const panel = document.createElement('div');
    panel.id = 'comparison-panel';
    panel.className = 'comparison-panel';
    panel.innerHTML = `
        <div class="comparison-header">
            <h3>Region Comparison</h3>
            <button class="clear-comparison" title="Clear all selections">Clear All</button>
            <button class="close-comparison" title="Close panel">×</button>
        </div>
        <div class="comparison-content">
            <p class="comparison-empty">Click on regions to compare (max 4)</p>
        </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    panel.querySelector('.clear-comparison').addEventListener('click', () => {
        selectedRegions = [];
        updateSelectionVisuals();
        updateComparisonPanel();
    });

    panel.querySelector('.close-comparison').addEventListener('click', () => {
        panel.classList.remove('visible');
    });

    return panel;
};

// Update comparison panel content
const updateComparisonPanel = () => {
    let panel = document.getElementById('comparison-panel');
    if (!panel) {
        panel = createComparisonPanel();
    }

    const content = panel.querySelector('.comparison-content');

    if (selectedRegions.length === 0) {
        content.innerHTML = '<p class="comparison-empty">Click on regions to compare (max 4)</p>';
        panel.classList.remove('visible');
        return;
    }

    panel.classList.add('visible');

    // Build comparison table
    let html = '<table class="comparison-table"><thead><tr><th>Metric</th>';
    selectedRegions.forEach(r => {
        html += `<th style="color: ${r.color}">${r.id}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Add metrics
    const metrics = [
        { label: 'Region Name', key: 'name', format: v => v },
        { label: 'Income Level', key: 'incomeLevel', format: v => v },
        { label: 'Learning Poverty', key: 'learningPoverty', format: v => `${v.toFixed(1)}%` },
        { label: 'Out of School', key: 'outOfSchool', format: v => `${v.toFixed(1)}%` },
        { label: 'Completion Rate', key: 'completionRate', format: v => `${v.toFixed(1)}%` },
        { label: 'Spending/Pupil', key: 'spendingPerPupil', format: v => `$${v.toLocaleString()}` },
        { label: 'Gender Gap', key: 'genderGap', format: v => `${v.toFixed(1)}pp` }
    ];

    metrics.forEach(metric => {
        html += `<tr><td class="metric-label">${metric.label}</td>`;
        selectedRegions.forEach(r => {
            html += `<td>${metric.format(r[metric.key])}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    content.innerHTML = html;
};

// Add global controls
const addGlobalControls = () => {
    // Add compare mode toggle
    const header = document.querySelector('.dashboard-header');

    const compareToggle = document.createElement('button');
    compareToggle.className = 'compare-toggle';
    compareToggle.textContent = 'Compare Mode';
    compareToggle.title = 'Click to enable comparison between regions';

    compareToggle.addEventListener('click', () => {
        compareToggle.classList.toggle('active');
        interactionMode = compareToggle.classList.contains('active') ? 'select' : 'hover';

        // Update cursor style
        document.querySelectorAll('.selectable').forEach(el => {
            el.style.cursor = interactionMode === 'select' ? 'crosshair' : 'pointer';
        });

        // Clear selections when exiting compare mode
        if (interactionMode === 'hover') {
            selectedRegions = [];
            updateSelectionVisuals();
            const panel = document.getElementById('comparison-panel');
            if (panel) panel.classList.remove('visible');
        }
    });

    document.body.appendChild(compareToggle);

    // Add income level filter
    addIncomeFilter();

    // Add keyboard shortcuts
    addKeyboardShortcuts();
};

// Add income level filter
const addIncomeFilter = () => {
    const panel1 = document.querySelector('#panel1');

    const filterContainer = document.createElement('div');
    filterContainer.className = 'controls';
    filterContainer.innerHTML = `
        <div class="control-label">Filter by Income:</div>
        <div class="filter-control">
            <button class="filter-button active" data-income="All">All</button>
            <button class="filter-button" data-income="Low">Low</button>
            <button class="filter-button" data-income="Lower-middle">L-Mid</button>
            <button class="filter-button" data-income="Upper-middle">U-Mid</button>
            <button class="filter-button" data-income="High">High</button>
        </div>
    `;

    panel1.appendChild(filterContainer);

    // Add filter functionality
    const buttons = filterContainer.querySelectorAll('.filter-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            const selectedIncome = button.dataset.income;

            // Filter visualizations
            d3.selectAll('.bar, .circle, .equity-bar, .region-path')
                .transition()
                .duration(300)
                .style('opacity', d => {
                    if (!d || selectedIncome === 'All') return 1;
                    return d.incomeLevel === selectedIncome ? 1 : 0.15;
                });
        });
    });
};

// Add keyboard shortcuts
const addKeyboardShortcuts = () => {
    document.addEventListener('keydown', (event) => {
        // Press 'R' to reset all highlights
        if (event.key === 'r' || event.key === 'R') {
            linkedHighlight.clear();
            tooltip.hide();
        }

        // Press 'H' to toggle help
        if (event.key === 'h' || event.key === 'H') {
            toggleHelp();
        }

        // Press 'C' to toggle compare mode
        if (event.key === 'c' || event.key === 'C') {
            const toggle = document.querySelector('.compare-toggle');
            if (toggle) toggle.click();
        }

        // Press 'F' to cycle through filters
        if (event.key === 'f' || event.key === 'F') {
            const buttons = document.querySelectorAll('.filter-button');
            const activeButton = document.querySelector('.filter-button.active');
            const currentIndex = Array.from(buttons).indexOf(activeButton);
            const nextIndex = (currentIndex + 1) % buttons.length;
            buttons[nextIndex].click();
        }

        // Press 'D' to toggle drag mode
        if (event.key === 'd' || event.key === 'D') {
            event.preventDefault();
            toggleDragMode();
        }

        // Press 'S' to save positions
        if (event.key === 's' || event.key === 'S') {
            event.preventDefault();
            savePositions();
        }
    });
};

// Toggle help overlay
let helpVisible = false;
const toggleHelp = () => {
    if (!helpVisible) {
        const helpOverlay = document.createElement('div');
        helpOverlay.id = 'help-overlay';
        helpOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        `;

        helpOverlay.innerHTML = `
            <div style="max-width: 800px; background: #2b2d42; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 style="margin-top: 0; color: #667eea;">Interactive Dashboard Guide</h2>

                <h3 style="color: #fcbf49; margin-top: 24px;">Panel 1: Learning Poverty</h3>
                <p>Hover over bars to see detailed metrics. Regions are ranked by learning poverty rate.</p>

                <h3 style="color: #fcbf49; margin-top: 20px;">Panel 2: Access vs Completion</h3>
                <p>Scatter plot with regression line. Circle size = spending per pupil. Strong negative correlation between out-of-school rate and completion.</p>

                <h3 style="color: #fcbf49; margin-top: 20px;">Panel 3: Spending Efficiency</h3>
                <p>Green frontier = efficient regions achieving maximum outcomes for their spending. Red dashed lines = efficiency gaps.</p>

                <h3 style="color: #fcbf49; margin-top: 20px;">Panel 4: Equity Analysis</h3>
                <p>Gender gaps in completion rates. Color = income level. Low-income regions show much larger gender disparities.</p>

                <h3 style="color: #fcbf49; margin-top: 24px;">Keyboard Shortcuts</h3>
                <ul style="line-height: 1.8;">
                    <li><strong>H</strong> - Toggle this help</li>
                    <li><strong>R</strong> - Reset all highlights</li>
                    <li><strong>C</strong> - Toggle compare mode</li>
                    <li><strong>F</strong> - Cycle through income filters</li>
                    <li><strong>D</strong> - Toggle drag mode (move labels/notes/legends)</li>
                    <li><strong>S</strong> - Save positions to JSON file</li>
                </ul>

                <h3 style="color: #fcbf49; margin-top: 24px;">Interactions</h3>
                <ul style="line-height: 1.8;">
                    <li><strong>Hover</strong> - See detailed tooltips</li>
                    <li><strong>Linked Highlighting</strong> - Hovering on one panel highlights the same region across all panels</li>
                    <li><strong>Filter by Income</strong> - Use controls in top-left panel</li>
                    <li><strong>Compare Mode</strong> - Click button or press C to enable. Click up to 4 regions to compare side-by-side in the comparison panel</li>
                </ul>

                <div style="text-align: center; margin-top: 32px;">
                    <button onclick="document.getElementById('help-overlay').remove(); helpVisible = false;"
                            style="background: #667eea; color: white; border: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 600;">
                        Close (or press H)
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(helpOverlay);

        helpOverlay.addEventListener('click', (e) => {
            if (e.target === helpOverlay) {
                helpOverlay.remove();
                helpVisible = false;
            }
        });

        helpVisible = true;
    } else {
        const overlay = document.getElementById('help-overlay');
        if (overlay) {
            overlay.remove();
            helpVisible = false;
        }
    }
};

// Add accessibility features
const addAccessibilityFeatures = () => {
    // Add ARIA labels
    document.querySelectorAll('.panel').forEach((panel, index) => {
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', `Panel ${index + 1}`);
    });

    // Add focus indicators
    document.querySelectorAll('.selectable').forEach(el => {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');

        el.addEventListener('focus', function(event) {
            const d = d3.select(this).datum();
            if (d) {
                linkedHighlight.highlight(d.id);
            }
        });

        el.addEventListener('blur', () => {
            linkedHighlight.clear();
        });
    });

    // Add screen reader announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    // Announce when regions are highlighted
    let lastAnnouncement = '';
    setInterval(() => {
        if (linkedHighlight.currentRegion) {
            const region = globalData.regions.find(r => r.id === linkedHighlight.currentRegion);
            if (region) {
                const announcement = `${region.name}: Learning poverty ${region.learningPoverty.toFixed(1)}%, Completion ${region.completionRate.toFixed(1)}%`;
                if (announcement !== lastAnnouncement) {
                    liveRegion.textContent = announcement;
                    lastAnnouncement = announcement;
                }
            }
        }
    }, 1000);
};

// Error display
const showError = (message) => {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #e63946;
        color: white;
        padding: 30px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 10000;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDashboard,
        addGlobalControls,
        toggleHelp
    };
}
