// Panel 4: Equity Analysis - Gender Gaps
// Question: What other factors affect opportunity (e.g., gender gaps)?

const createEquityAnalysisPanel = (data, container) => {
    const margin = { top: 20, right: 120, bottom: 45, left: 220 };
    const width = 920 - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    // Filter and sort by gender gap (descending)
    const regions = data.regions
        .filter(d => d.id !== 'WORLD')
        .sort((a, b) => b.genderGap - a.genderGap);

    const svg = createSVG(container, 920, 380, margin);

    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(regions, d => d.genderGap) * 1.15])
        .range([0, width]);

    const yScale = d3.scaleBand()
        .domain(regions.map(d => d.name))
        .range([0, height])
        .padding(0.25);

    // Color scale by income level
    const incomeColorScale = d3.scaleOrdinal()
        .domain(['Low', 'Lower-middle', 'Upper-middle', 'High'])
        .range(['#e63946', '#f77f00', '#fcbf49', '#06a77d']);

    // Add grid
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );

    // Reference line at 0
    svg.append('line')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#2b2d42')
        .attr('stroke-width', 2);

    // Gender gap bars
    const barGroups = svg.selectAll('.bar-group')
        .data(regions)
        .enter()
        .append('g')
        .attr('class', 'bar-group');

    // Background bars (completion rate)
    barGroups.append('rect')
        .attr('class', 'completion-bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.name))
        .attr('width', 0)
        .attr('height', yScale.bandwidth() * 0.4)
        .attr('fill', '#e9ecef')
        .attr('opacity', 0.6)
        .transition()
        .duration(800)
        .attr('width', d => width * (d.completionRate / 100));

    // Gender gap bars
    const genderBars = barGroups.append('rect')
        .attr('class', 'equity-bar selectable')
        .attr('x', 0)
        .attr('y', d => yScale(d.name) + yScale.bandwidth() * 0.4 + 2)
        .attr('width', 0)
        .attr('height', yScale.bandwidth() * 0.55)
        .attr('fill', d => incomeColorScale(d.incomeLevel))
        .attr('rx', 3)
        .on('mouseenter', function(event, d) {
            linkedHighlight.highlight(d.id);

            const html = `
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Gender Gap:</span>
                    <span class="tooltip-value">${formatNumber(d.genderGap)}pp</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Completion Rate:</span>
                    <span class="tooltip-value">${formatPercent(d.completionRate)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Income Level:</span>
                    <span class="tooltip-value">${d.incomeLevel}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Learning Poverty:</span>
                    <span class="tooltip-value">${formatPercent(d.learningPoverty)}</span>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 11px; opacity: 0.9;">
                    Gender gap = male completion % - female completion %
                </div>
            `;
            tooltip.show(html, event);
        })
        .on('mousemove', (event) => tooltip.move(event))
        .on('mouseleave', () => {
            linkedHighlight.clear();
            tooltip.hide();
        });

    // Animate gender gap bars
    genderBars.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('width', d => xScale(d.genderGap));

    // Value labels
    svg.selectAll('.value-label')
        .data(regions)
        .enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.genderGap) + 6)
        .attr('y', d => yScale(d.name) + yScale.bandwidth() * 0.7)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', d => incomeColorScale(d.incomeLevel))
        .style('opacity', 0)
        .text(d => `${d.genderGap.toFixed(1)}pp`)
        .transition()
        .duration(800)
        .delay((d, i) => i * 50 + 600)
        .style('opacity', 1);

    // Y-axis (region names)
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '500');

    // X-axis
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}pp`));

    // Axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .text('Gender Gap in Completion Rate (percentage points, male - female)');

    // Income level legend
    const incomeLevels = ['High', 'Upper-middle', 'Lower-middle', 'Low'];
    const legendPos4 = positions?.panel4?.incomeLegend || { x: 640, y: 0 };
    const legend = svg.append('g')
        .attr('class', 'legend draggable')
        .attr('transform', `translate(${legendPos4.x}, ${legendPos4.y})`);

    legend.append('text')
        .attr('x', 0)
        .attr('y', -8)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#495057')
        .text('Income Level:');

    incomeLevels.forEach((level, i) => {
        const item = legend.append('g')
            .attr('transform', `translate(0, ${i * 22})`);

        item.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('fill', incomeColorScale(level))
            .attr('rx', 2);

        item.append('text')
            .attr('x', 20)
            .attr('y', 7)
            .attr('dominant-baseline', 'middle')
            .style('font-size', '11px')
            .style('fill', '#495057')
            .text(level);
    });

    makeDraggable(legend, 'panel4', 'incomeLegend', (x, y) => {
        if (positions?.panel4) {
            positions.panel4.incomeLegend = { x, y };
        }
    });

    // World average reference line
    const worldAvg = data.regions.find(d => d.id === 'WORLD').genderGap;

    svg.append('line')
        .attr('x1', xScale(worldAvg))
        .attr('x2', xScale(worldAvg))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#6c757d')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.5);

    const worldAvgLabelY4 = positions?.panel4?.worldAvgLabel?.y || -10;
    const worldAvgLabel4 = svg.append('g')
        .attr('class', 'draggable')
        .attr('transform', `translate(${xScale(worldAvg)}, ${worldAvgLabelY4})`);

    worldAvgLabel4.append('text')
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#6c757d')
        .text(`World Avg: ${worldAvg.toFixed(1)}pp`);

    makeDraggable(worldAvgLabel4, 'panel4', 'worldAvgLabel', (x, y) => {
        if (positions?.panel4) {
            positions.panel4.worldAvgLabel = { y };
        }
    });

    // Annotations
    const annLargest = addAnnotation(
        svg,
        xScale(regions[0].genderGap),
        yScale(regions[0].name) + yScale.bandwidth() / 2,
        'Largest gap',
        60,
        -20
    );
    makeAnnotationTextDraggable(annLargest, 'panel4', 'annotationLargest', positions);

    const annParity = addAnnotation(
        svg,
        xScale(regions[regions.length - 1].genderGap),
        yScale(regions[regions.length - 1].name) + yScale.bandwidth() / 2,
        'Near parity',
        60,
        -135
    );
    makeAnnotationTextDraggable(annParity, 'panel4', 'annotationParity', positions);

    // Small multiples showing completion by gender
    const miniChartData = [
        regions.find(d => d.id === 'WCA'),
        regions.find(d => d.id === 'LAC'),
        regions.find(d => d.id === 'WE')
    ];

    const miniChartPos = positions?.panel4?.miniCharts || { bottom: 5, left: 15 };
    const miniCharts = d3.select(container)
        .append('div')
        .attr('class', 'draggable')
        .style('position', 'absolute')
        .style('display', 'flex')
        .style('gap', '12px');

    // Apply saved positions dynamically
    if (miniChartPos.bottom !== undefined) miniCharts.style('bottom', `${miniChartPos.bottom}px`);
    if (miniChartPos.top !== undefined) miniCharts.style('top', `${miniChartPos.top}px`);
    if (miniChartPos.left !== undefined) miniCharts.style('left', `${miniChartPos.left}px`);
    if (miniChartPos.right !== undefined) miniCharts.style('right', `${miniChartPos.right}px`);

    miniChartData.forEach(region => {
        const miniChart = miniCharts.append('div')
            .style('background', 'white')
            .style('border', '1px solid #dee2e6')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('width', '120px');

        miniChart.append('div')
            .style('font-size', '10px')
            .style('font-weight', '600')
            .style('margin-bottom', '6px')
            .style('color', region.color)
            .text(region.id);

        // Female completion (estimated)
        const femaleCompletion = region.completionRate + (region.genderGap / 2);
        const maleCompletion = region.completionRate - (region.genderGap / 2);

        const genderData = [
            { gender: '♀', value: femaleCompletion, color: '#e63946' },
            { gender: '♂', value: maleCompletion, color: '#4361ee' }
        ];

        const miniSvg = d3.select(miniChart.node())
            .append('svg')
            .attr('width', 104)
            .attr('height', 40);

        const miniXScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, 104]);

        genderData.forEach((d, i) => {
            miniSvg.append('rect')
                .attr('x', 0)
                .attr('y', i * 18)
                .attr('width', miniXScale(d.value))
                .attr('height', 14)
                .attr('fill', d.color)
                .attr('opacity', 0.7)
                .attr('rx', 2);

            miniSvg.append('text')
                .attr('x', 2)
                .attr('y', i * 18 + 7)
                .attr('dominant-baseline', 'middle')
                .style('font-size', '11px')
                .style('font-weight', '600')
                .style('fill', 'white')
                .text(d.gender);

            miniSvg.append('text')
                .attr('x', miniXScale(d.value) - 2)
                .attr('y', i * 18 + 7)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '9px')
                .style('font-weight', '600')
                .style('fill', 'white')
                .text(`${d.value.toFixed(0)}%`);
        });
    });

    makeDivDraggable(miniCharts.node(), 'panel4', 'miniCharts');

    // Floating note
    const notePos4 = positions?.panel4?.floatingNote || { top: 5, right: 140 };
    const floatingNote4 = d3.select(container)
        .append('div')
        .attr('class', 'floating-note warning draggable')
        .html('<strong>Gender Inequality:</strong> Low-income regions show 40x larger gender gaps than high-income regions. Equity improves dramatically with economic development.');

    // Apply saved positions dynamically
    if (notePos4.bottom !== undefined) floatingNote4.style('bottom', `${notePos4.bottom}px`);
    if (notePos4.top !== undefined) floatingNote4.style('top', `${notePos4.top}px`);
    if (notePos4.left !== undefined) floatingNote4.style('left', `${notePos4.left}px`);
    if (notePos4.right !== undefined) floatingNote4.style('right', `${notePos4.right}px`);

    makeDivDraggable(floatingNote4.node(), 'panel4', 'floatingNote');
};
