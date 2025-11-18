// Panel 2: Out-of-School vs Completion Rate
// Question: Do higher out-of-school rates coincide with lower completion? How strong?

const createAccessCompletionPanel = (data, container) => {
    const margin = { top: 20, right: 20, bottom: 45, left: 60 };
    const width = 920 - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    // Filter out World Average for regression
    const regions = data.regions.filter(d => d.id !== 'WORLD');
    const worldAvg = data.regions.find(d => d.id === 'WORLD');

    const svg = createSVG(container, 920, 380, margin);

    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(regions, d => d.outOfSchool) * 1.1])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([50, 100])
        .range([height, 0]);

    // Size scale based on spending
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(regions, d => d.spendingPerPupil)])
        .range([6, 24]);

    // Add grid lines
    addGridLines(svg, xScale, yScale, width, height);

    // Calculate regression
    const regression = linearRegression(regions, 'outOfSchool', 'completionRate');

    // Confidence band (simplified)
    const confidenceBand = regions.map(d => {
        const predicted = regression.slope * d.outOfSchool + regression.intercept;
        const residual = d.completionRate - predicted;
        return {
            x: d.outOfSchool,
            yLow: predicted - 5,
            yHigh: predicted + 5
        };
    }).sort((a, b) => a.x - b.x);

    // Draw confidence band
    const area = d3.area()
        .x(d => xScale(d.x))
        .y0(d => yScale(d.yLow))
        .y1(d => yScale(d.yHigh))
        .curve(d3.curveBasis);

    svg.append('path')
        .datum(confidenceBand)
        .attr('class', 'confidence-band')
        .attr('d', area);

    // Draw regression line
    const lineData = [
        { x: 0, y: regression.intercept },
        { x: d3.max(regions, d => d.outOfSchool), y: regression.slope * d3.max(regions, d => d.outOfSchool) + regression.intercept }
    ];

    svg.append('line')
        .attr('class', 'regression-line')
        .attr('x1', xScale(lineData[0].x))
        .attr('y1', yScale(lineData[0].y))
        .attr('x2', xScale(lineData[1].x))
        .attr('y2', yScale(lineData[1].y))
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 1);

    // Scatter points
    const circles = svg.selectAll('.circle')
        .data(regions)
        .enter()
        .append('circle')
        .attr('class', 'circle selectable')
        .attr('cx', d => xScale(d.outOfSchool))
        .attr('cy', d => yScale(d.completionRate))
        .attr('r', 0)
        .attr('fill', d => d.color)
        .attr('opacity', 0.8)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseenter', function(event, d) {
            linkedHighlight.highlight(d.id);

            const predicted = regression.slope * d.outOfSchool + regression.intercept;
            const residual = d.completionRate - predicted;

            const html = `
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Out-of-school:</span>
                    <span class="tooltip-value">${formatPercent(d.outOfSchool)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Completion:</span>
                    <span class="tooltip-value">${formatPercent(d.completionRate)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Spending/pupil:</span>
                    <span class="tooltip-value">${formatCurrency(d.spendingPerPupil)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">vs Expected:</span>
                    <span class="tooltip-value" style="color: ${residual > 0 ? '#06a77d' : '#e63946'}">${residual > 0 ? '+' : ''}${residual.toFixed(1)}pp</span>
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
        .attr('r', d => sizeScale(d.spendingPerPupil));

    // Add region labels for key regions
    const labeledRegions = [
        regions.find(d => d.id === 'ESA'),
        regions.find(d => d.id === 'WE'),
        regions.find(d => d.id === 'SA')
    ];

    svg.selectAll('.region-label')
        .data(labeledRegions)
        .enter()
        .append('text')
        .attr('class', 'region-label')
        .attr('x', d => xScale(d.outOfSchool))
        .attr('y', d => yScale(d.completionRate) - sizeScale(d.spendingPerPupil) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', d => d.color)
        .style('opacity', 0)
        .text(d => d.id)
        .transition()
        .duration(500)
        .delay(1000)
        .style('opacity', 1);

    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`));

    // Axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .text('Out-of-school Rate (% of primary-age children)');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .text('Primary Completion Rate (%)');

    // Regression equation and R²
    const eqPos = positions?.panel2?.regressionEquation || { x: 10, y: 20 };
    const regressionEq = svg.append('g')
        .attr('class', 'draggable')
        .attr('transform', `translate(${eqPos.x}, ${eqPos.y})`);

    regressionEq.append('text')
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#e63946')
        .text(`y = ${regression.slope.toFixed(2)}x + ${regression.intercept.toFixed(1)}`);

    makeDraggable(regressionEq, 'panel2', 'regressionEquation', (x, y) => {
        if (positions?.panel2) {
            positions.panel2.regressionEquation = { x, y };
        }
    });

    const r2Pos = positions?.panel2?.rSquared || { x: 10, y: 38 };
    const rSquaredLabel = svg.append('g')
        .attr('class', 'draggable')
        .attr('transform', `translate(${r2Pos.x}, ${r2Pos.y})`);

    rSquaredLabel.append('text')
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#e63946')
        .text(`R² = ${regression.r2.toFixed(3)}`);

    makeDraggable(rSquaredLabel, 'panel2', 'rSquared', (x, y) => {
        if (positions?.panel2) {
            positions.panel2.rSquared = { x, y };
        }
    });

    // Size legend - title
    const legendTitlePos2 = positions?.panel2?.sizeLegendTitle || { x: 660, y: 235 };
    const sizeLegendTitle2 = svg.append('g')
        .attr('class', 'size-legend-title draggable')
        .attr('transform', `translate(${legendTitlePos2.x}, ${legendTitlePos2.y})`);

    sizeLegendTitle2.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#495057')
        .text('Spending per pupil:');

    makeDraggable(sizeLegendTitle2, 'panel2', 'sizeLegendTitle', (x, y) => {
        if (positions?.panel2) {
            positions.panel2.sizeLegendTitle = { x, y };
        }
    });

    // Individual draggable circle items
    const legendSizes = [500, 5000, 10000];
    legendSizes.forEach((value, i) => {
        const defaultY = legendTitlePos2.y + 10 + (i * 26); // Default positioning below title
        const itemPos = positions?.panel2?.[`sizeLegendItem${i}`] || { x: 660, y: defaultY };

        const legendItem = svg.append('g')
            .attr('class', `size-legend-item draggable`)
            .attr('transform', `translate(${itemPos.x}, ${itemPos.y})`);

        legendItem.append('circle')
            .attr('cx', 10)
            .attr('cy', 0)
            .attr('r', sizeScale(value))
            .attr('fill', '#adb5bd')
            .attr('opacity', 0.4)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        legendItem.append('text')
            .attr('x', 30)
            .attr('y', 3)
            .style('font-size', '10px')
            .style('fill', '#495057')
            .text(formatCurrency(value));

        makeDraggable(legendItem, 'panel2', `sizeLegendItem${i}`, (x, y) => {
            if (positions?.panel2) {
                positions.panel2[`sizeLegendItem${i}`] = { x, y };
            }
        });
    });

    // Floating note for correlation
    const notePos2 = positions?.panel2?.floatingNote || { bottom: 10, left: 10 };
    const floatingNote2 = d3.select(container)
        .append('div')
        .attr('class', 'floating-note warning draggable')
        .html(`<strong>Strong Correlation:</strong> Each 1pp increase in out-of-school rate associates with ${Math.abs(regression.slope).toFixed(1)}pp decrease in completion (R²=${regression.r2.toFixed(2)}).`);

    // Apply saved positions dynamically
    if (notePos2.bottom !== undefined) floatingNote2.style('bottom', `${notePos2.bottom}px`);
    if (notePos2.top !== undefined) floatingNote2.style('top', `${notePos2.top}px`);
    if (notePos2.left !== undefined) floatingNote2.style('left', `${notePos2.left}px`);
    if (notePos2.right !== undefined) floatingNote2.style('right', `${notePos2.right}px`);

    makeDivDraggable(floatingNote2.node(), 'panel2', 'floatingNote');
};
