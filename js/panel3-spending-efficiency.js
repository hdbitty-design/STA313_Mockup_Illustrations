// Panel 3: Spending Efficiency Analysis
// Question: If two regions spend similarly, which achieves more learning (more efficient)?

const createSpendingEfficiencyPanel = (data, container) => {
    const margin = { top: 40, right: 20, bottom: 55, left: 70 };
    const width = 920 - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    // Filter out World Average
    const regions = data.regions.filter(d => d.id !== 'WORLD');

    // Calculate efficiency
    const regionsWithEfficiency = calculateEfficiency(
        regions,
        'spendingPerPupil',
        'completionRate'
    );

    const svg = createSVG(container, 920, 380, margin);

    // Scales - use log scale for spending
    const xScale = d3.scaleLog()
        .domain([100, d3.max(regions, d => d.spendingPerPupil) * 1.2])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([50, 100])
        .range([height, 0]);

    // Size scale based on learning poverty (inverse - smaller = worse)
    const sizeScale = d3.scaleSqrt()
        .domain([0, 100])
        .range([8, 20]);

    // Add grid lines
    addGridLines(svg, xScale, yScale, width, height);

    // Draw efficiency frontier (connect efficient points)
    const efficientRegions = regionsWithEfficiency
        .filter(d => d.efficient)
        .sort((a, b) => a.spendingPerPupil - b.spendingPerPupil);

    const frontierLine = d3.line()
        .x(d => xScale(d.spendingPerPupil))
        .y(d => yScale(d.completionRate))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(efficientRegions)
        .attr('class', 'efficiency-frontier')
        .attr('d', frontierLine)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);

    // Shade inefficient region
    const area = d3.area()
        .x(d => xScale(d.spendingPerPupil))
        .y0(height)
        .y1(d => yScale(d.completionRate))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(efficientRegions)
        .attr('d', area)
        .attr('fill', '#06a77d')
        .attr('opacity', 0.05);

    // Bubble chart
    const bubbles = svg.selectAll('.bubble')
        .data(regionsWithEfficiency)
        .enter()
        .append('g')
        .attr('class', 'bubble-group');

    // Efficiency indicators (for inefficient regions)
    bubbles.filter(d => !d.efficient)
        .append('line')
        .attr('class', 'efficiency-gap-line')
        .attr('x1', d => xScale(d.spendingPerPupil))
        .attr('y1', d => yScale(d.completionRate))
        .attr('x2', d => xScale(d.spendingPerPupil))
        .attr('y2', d => yScale(d.completionRate + d.efficiencyGap))
        .attr('stroke', '#e63946')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay(1200)
        .attr('opacity', 0.6);

    // Circles
    const circles = bubbles.append('circle')
        .attr('class', 'circle selectable')
        .attr('cx', d => xScale(d.spendingPerPupil))
        .attr('cy', d => yScale(d.completionRate))
        .attr('r', 0)
        .attr('fill', d => d.color)
        .attr('opacity', 0.85)
        .attr('stroke', d => d.efficient ? '#06a77d' : '#adb5bd')
        .attr('stroke-width', d => d.efficient ? 3 : 1.5)
        .on('mouseenter', function(event, d) {
            linkedHighlight.highlight(d.id);

            const efficiencyStatus = d.efficient
                ? '<span style="color: #06a77d">✓ Efficient</span>'
                : `<span style="color: #e63946">Gap: ${d.efficiencyGap.toFixed(1)}pp</span>`;

            const html = `
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Spending/pupil:</span>
                    <span class="tooltip-value">${formatCurrency(d.spendingPerPupil)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Completion:</span>
                    <span class="tooltip-value">${formatPercent(d.completionRate)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Learning Poverty:</span>
                    <span class="tooltip-value">${formatPercent(d.learningPoverty)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Efficiency:</span>
                    <span class="tooltip-value">${efficiencyStatus}</span>
                </div>
            `;
            tooltip.show(html, event);
        })
        .on('mousemove', (event) => tooltip.move(event))
        .on('mouseleave', () => {
            linkedHighlight.clear();
            tooltip.hide();
        });

    // Animate circles
    circles.transition()
        .duration(800)
        .delay((d, i) => i * 60)
        .attr('r', d => sizeScale(100 - d.learningPoverty));

    // Add efficiency badges
    bubbles.filter(d => d.efficient)
        .append('text')
        .attr('x', d => xScale(d.spendingPerPupil))
        .attr('y', d => yScale(d.completionRate) - sizeScale(100 - d.learningPoverty) - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('opacity', 0)
        .text('⭐')
        .transition()
        .duration(500)
        .delay(1500)
        .style('opacity', 1);

    // Labels for key regions
    const labeledRegions = [
        regionsWithEfficiency.find(d => d.id === 'SA'),
        regionsWithEfficiency.find(d => d.id === 'MENA'),
        regionsWithEfficiency.find(d => d.id === 'LAC')
    ];

    svg.selectAll('.region-label')
        .data(labeledRegions)
        .enter()
        .append('text')
        .attr('class', 'region-label')
        .attr('x', d => xScale(d.spendingPerPupil))
        .attr('y', d => yScale(d.completionRate) + sizeScale(100 - d.learningPoverty) + 14)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', d => d.color)
        .text(d => d.id);

    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(5, d3.format("$,.0f"))
            .tickValues([200, 500, 1000, 2000, 5000, 10000])
        );

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`));

    // Axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .text('Spending per Pupil (USD, log scale)');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -52)
        .attr('text-anchor', 'middle')
        .text('Primary Completion Rate (%)');

    // Efficiency frontier label
    const effLabelPos = positions?.panel3?.efficiencyLabel || { x: 10, y: 20 };
    const effLabel = svg.append('g')
        .attr('class', 'draggable')
        .attr('transform', `translate(${effLabelPos.x}, ${effLabelPos.y})`);

    effLabel.append('text')
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#06a77d')
        .text('← Efficiency Frontier');

    makeDraggable(effLabel, 'panel3', 'efficiencyLabel', (x, y) => {
        if (positions?.panel3) {
            positions.panel3.efficiencyLabel = { x, y };
        }
    });

    // Legend for bubble size - title
    const legendTitlePos = positions?.panel3?.sizeLegendTitle || { x: 10, y: 215 };
    const sizeLegendTitle = svg.append('g')
        .attr('class', 'size-legend-title draggable')
        .attr('transform', `translate(${legendTitlePos.x}, ${legendTitlePos.y})`);

    sizeLegendTitle.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#495057')
        .text('% with basic literacy:');

    makeDraggable(sizeLegendTitle, 'panel3', 'sizeLegendTitle', (x, y) => {
        if (positions?.panel3) {
            positions.panel3.sizeLegendTitle = { x, y };
        }
    });

    // Individual draggable circle items
    const legendSizes = [10, 50, 90];
    legendSizes.forEach((value, i) => {
        const displayValue = 100 - value; // Invert for display
        const defaultY = legendTitlePos.y + 20 + (i * 37); // Default positioning below title
        const itemPos = positions?.panel3?.[`sizeLegendItem${i}`] || { x: 10, y: defaultY };

        const legendItem = svg.append('g')
            .attr('class', `size-legend-item draggable`)
            .attr('transform', `translate(${itemPos.x}, ${itemPos.y})`);

        legendItem.append('circle')
            .attr('cx', 10)
            .attr('cy', 0)
            .attr('r', sizeScale(displayValue))
            .attr('fill', '#adb5bd')
            .attr('opacity', 0.4)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        legendItem.append('text')
            .attr('x', 30)
            .attr('y', 3)
            .style('font-size', '10px')
            .style('fill', '#495057')
            .text(`${displayValue}%`);

        makeDraggable(legendItem, 'panel3', `sizeLegendItem${i}`, (x, y) => {
            if (positions?.panel3) {
                positions.panel3[`sizeLegendItem${i}`] = { x, y };
            }
        });
    });

    // Annotations
    const inefficientExample = regionsWithEfficiency.find(d => d.id === 'ESA');
    if (inefficientExample && inefficientExample.efficiencyGap > 0) {
        addAnnotation(
            svg,
            xScale(inefficientExample.spendingPerPupil),
            yScale(inefficientExample.completionRate + inefficientExample.efficiencyGap / 2),
            `${inefficientExample.efficiencyGap.toFixed(0)}pp gap`,
            50,
            30
        );
    }

    // Floating note
    const notePos3 = positions?.panel3?.floatingNote || { top: 10, right: 10 };
    const floatingNote3 = d3.select(container)
        .append('div')
        .attr('class', 'floating-note insight draggable')
        .html(`<strong>Efficiency Analysis:</strong> Regions on the green frontier (marked with ⭐) achieve maximum outcomes for their spending level. Circle size represents literacy rates—larger circles indicate better educational quality.`);

    // Apply saved positions dynamically
    if (notePos3.bottom !== undefined) floatingNote3.style('bottom', `${notePos3.bottom}px`);
    if (notePos3.top !== undefined) floatingNote3.style('top', `${notePos3.top}px`);
    if (notePos3.left !== undefined) floatingNote3.style('left', `${notePos3.left}px`);
    if (notePos3.right !== undefined) floatingNote3.style('right', `${notePos3.right}px`);

    makeDivDraggable(floatingNote3.node(), 'panel3', 'floatingNote');
};
