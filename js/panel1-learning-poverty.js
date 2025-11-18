// Panel 1: Learning Poverty by Region
// Question: In which regions is learning poverty highest/lowest?

const createLearningPovertyPanel = (data, container) => {
    const margin = { top: 20, right: 140, bottom: 35, left: 180 };
    const width = 920 - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    // Filter out World Average and sort by learning poverty (descending)
    const regions = data.regions
        .filter(d => d.id !== 'WORLD')
        .sort((a, b) => b.learningPoverty - a.learningPoverty);

    const svg = createSVG(container, 920, 380, margin);

    // Scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(regions, d => d.learningPoverty) * 1.1])
        .range([0, width]);

    const yScale = d3.scaleBand()
        .domain(regions.map(d => d.name))
        .range([0, height])
        .padding(0.2);

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );

    // Bars
    const bars = svg.selectAll('.bar')
        .data(regions)
        .enter()
        .append('rect')
        .attr('class', 'bar selectable')
        .attr('x', 0)
        .attr('y', d => yScale(d.name))
        .attr('width', 0)
        .attr('height', yScale.bandwidth())
        .attr('fill', d => d.color)
        .attr('rx', 4)
        .on('mouseenter', function(event, d) {
            linkedHighlight.highlight(d.id);

            const html = `
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Learning Poverty:</span>
                    <span class="tooltip-value">${formatPercent(d.learningPoverty)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Out-of-school:</span>
                    <span class="tooltip-value">${formatPercent(d.outOfSchool)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Completion Rate:</span>
                    <span class="tooltip-value">${formatPercent(d.completionRate)}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Income Level:</span>
                    <span class="tooltip-value">${d.incomeLevel}</span>
                </div>
            `;
            tooltip.show(html, event);
        })
        .on('mousemove', (event) => tooltip.move(event))
        .on('mouseleave', () => {
            linkedHighlight.clear();
            tooltip.hide();
        });

    // Animate bars
    bars.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('width', d => xScale(d.learningPoverty));

    // Value labels
    svg.selectAll('.value-label')
        .data(regions)
        .enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.learningPoverty) + 8)
        .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('opacity', 0)
        .text(d => `${d.learningPoverty.toFixed(1)}%`)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50 + 500)
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
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`));

    // X-axis label
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .text('Learning Poverty (% of 10-year-olds unable to read with comprehension)');

    // Add world average reference line
    const worldAvg = data.regions.find(d => d.id === 'WORLD').learningPoverty;

    svg.append('line')
        .attr('x1', xScale(worldAvg))
        .attr('x2', xScale(worldAvg))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#6c757d')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.6);

    const worldAvgLabelY = positions?.panel1?.worldAvgLabel?.y || -10;
    const worldAvgLabel = svg.append('g')
        .attr('class', 'draggable')
        .attr('transform', `translate(${xScale(worldAvg)}, ${worldAvgLabelY})`);

    worldAvgLabel.append('text')
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', '#6c757d')
        .text(`World Avg: ${worldAvg.toFixed(1)}%`);

    makeDraggable(worldAvgLabel, 'panel1', 'worldAvgLabel', (x, y) => {
        if (positions?.panel1) {
            positions.panel1.worldAvgLabel = { y };
        }
    });

    // Annotations for insights
    const annHighest = addAnnotation(
        svg,
        xScale(regions[0].learningPoverty),
        yScale(regions[0].name) + yScale.bandwidth() / 2,
        'Highest risk',
        60,
        -30
    );
    makeAnnotationTextDraggable(annHighest, 'panel1', 'annotationHighest', positions);

    const annLowest = addAnnotation(
        svg,
        xScale(regions[regions.length - 1].learningPoverty),
        yScale(regions[regions.length - 1].name) + yScale.bandwidth() / 2,
        'Lowest risk',
        60,
        -45
    );
    makeAnnotationTextDraggable(annLowest, 'panel1', 'annotationLowest', positions);

    // Floating note for income correlation
    const notePos = positions?.panel1?.floatingNote || { bottom: 10, right: 10 };
    const floatingNote = d3.select(container)
        .append('div')
        .attr('class', 'floating-note insight draggable')
        .html('<strong>Key Insight:</strong> Clear correlation between income level and learning outcomes—low-income regions face 12x higher learning poverty.');

    // Apply saved positions dynamically
    if (notePos.bottom !== undefined) floatingNote.style('bottom', `${notePos.bottom}px`);
    if (notePos.top !== undefined) floatingNote.style('top', `${notePos.top}px`);
    if (notePos.left !== undefined) floatingNote.style('left', `${notePos.left}px`);
    if (notePos.right !== undefined) floatingNote.style('right', `${notePos.right}px`);

    makeDivDraggable(floatingNote.node(), 'panel1', 'floatingNote');
};
