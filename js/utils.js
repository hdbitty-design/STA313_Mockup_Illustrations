// Shared Utility Functions for Education Dashboard

// Format numbers with appropriate precision
const formatNumber = (value, decimals = 1) => {
    return value.toFixed(decimals);
};

// Format currency
const formatCurrency = (value) => {
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
};

// Format percentage
const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
};

// Create tooltip
class Tooltip {
    constructor() {
        this.element = d3.select('body')
            .append('div')
            .attr('class', 'tooltip');
    }

    show(html, event) {
        this.element
            .html(html)
            .classed('visible', true)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    hide() {
        this.element.classed('visible', false);
    }

    move(event) {
        this.element
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }
}

// Shared tooltip instance
const tooltip = new Tooltip();

// Linked highlighting across panels
const linkedHighlight = {
    currentRegion: null,

    highlight(regionId) {
        this.currentRegion = regionId;

        // Highlight in all panels
        d3.selectAll('.bar, .circle, .region-path, .equity-bar')
            .classed('dimmed', d => d && d.id !== regionId && regionId !== null)
            .classed('highlighted', d => d && d.id === regionId);
    },

    clear() {
        this.currentRegion = null;
        d3.selectAll('.bar, .circle, .region-path, .equity-bar')
            .classed('dimmed', false)
            .classed('highlighted', false);
    }
};

// Calculate linear regression
const linearRegression = (data, xKey, yKey) => {
    const n = data.length;
    const sumX = d3.sum(data, d => d[xKey]);
    const sumY = d3.sum(data, d => d[yKey]);
    const sumXY = d3.sum(data, d => d[xKey] * d[yKey]);
    const sumX2 = d3.sum(data, d => d[xKey] * d[xKey]);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = d3.sum(data, d => Math.pow(d[yKey] - (slope * d[xKey] + intercept), 2));
    const ssTot = d3.sum(data, d => Math.pow(d[yKey] - yMean, 2));
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
};

// Add responsive SVG
const createSVG = (selector, width, height, margin) => {
    return d3.select(selector)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
};

// Add grid lines
const addGridLines = (svg, xScale, yScale, width, height) => {
    // Horizontal grid
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );

    // Vertical grid (optional)
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat('')
        );
};

// Add annotation with draggable text (line and dot stay fixed)
const addAnnotation = (svg, x, y, text, lineLength = 30, angle = -45) => {
    const group = svg.append('g')
        .attr('class', 'annotation')
        .attr('transform', `translate(${x},${y})`);

    // Calculate initial text position
    const radians = angle * Math.PI / 180;
    const endX = lineLength * Math.cos(radians);
    const endY = lineLength * Math.sin(radians);

    // Annotation line (will be updated when text moves)
    const line = group.append('line')
        .attr('class', 'annotation-line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', endX)
        .attr('y2', endY);

    // Annotation circle (stays at data point)
    group.append('circle')
        .attr('r', 4)
        .attr('fill', '#e63946');

    // Annotation text (draggable)
    const textGroup = group.append('g')
        .attr('class', 'annotation-text-draggable draggable')
        .attr('transform', `translate(${endX}, ${endY})`);

    textGroup.append('text')
        .attr('x', endX > 0 ? 8 : -8)
        .attr('y', 0)
        .attr('text-anchor', endX > 0 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text(text);

    // Store references for updating line
    group._line = line;
    group._textGroup = textGroup;
    group._initialEndX = endX;
    group._initialEndY = endY;

    return group;
};

// Make annotation text draggable (updates connecting line)
const makeAnnotationTextDraggable = (annotationGroup, panelId, elementId, positions) => {
    if (!annotationGroup._textGroup) return;

    const textGroup = annotationGroup._textGroup;
    const line = annotationGroup._line;
    const textElement = textGroup.select('text').node();

    // Helper function to update line endpoint and text anchor based on text position
    const updateLineEndpoint = (textX, textY) => {
        const textNode = textGroup.select('text');

        // Determine which edge to connect to based on relative position
        let connectionX = textX;
        let connectionY = textY;

        if (textX < 0) {
            // Text is on the left, update text to anchor at end
            textNode.attr('x', -8).attr('text-anchor', 'end');
            connectionX = textX - 8;
        } else {
            // Text is on the right, update text to anchor at start
            textNode.attr('x', 8).attr('text-anchor', 'start');
            connectionX = textX + 8;
        }

        line.attr('x2', connectionX).attr('y2', connectionY);
    };

    // Load saved position if available
    if (positions && positions[panelId] && positions[panelId][elementId]) {
        const saved = positions[panelId][elementId];
        if (saved.textX !== undefined && saved.textY !== undefined) {
            textGroup.attr('transform', `translate(${saved.textX}, ${saved.textY})`);
            updateLineEndpoint(saved.textX, saved.textY);
        }
    }

    const drag = d3.drag()
        .on('start', function(event) {
            if (!isDragMode) return;
            d3.select(this).style('cursor', 'grabbing').style('opacity', 0.8);
        })
        .on('drag', function(event) {
            if (!isDragMode) return;

            const currentTransform = d3.select(this).attr('transform') || 'translate(0,0)';
            const match = currentTransform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);

            let x = match ? parseFloat(match[1]) : annotationGroup._initialEndX;
            let y = match ? parseFloat(match[2]) : annotationGroup._initialEndY;

            x += event.dx;
            y += event.dy;

            // Update text position
            d3.select(this).attr('transform', `translate(${x},${y})`);

            // Update line endpoint intelligently
            updateLineEndpoint(x, y);

            // Save to positions
            if (positions && positions[panelId]) {
                if (!positions[panelId][elementId]) {
                    positions[panelId][elementId] = {};
                }
                positions[panelId][elementId].textX = x;
                positions[panelId][elementId].textY = y;
            }
        })
        .on('end', function(event) {
            if (!isDragMode) return;
            d3.select(this).style('cursor', 'grab').style('opacity', 1);
        });

    textGroup.call(drag);

    if (isDragMode) {
        textGroup.style('cursor', 'grab');
    }
};

// Wrap text for labels
const wrap = (text, width) => {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr('y');
        const dy = parseFloat(text.attr('dy') || 0);
        let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];
                tspan = text.append('tspan')
                    .attr('x', 0)
                    .attr('y', y)
                    .attr('dy', ++lineNumber * lineHeight + dy + 'em')
                    .text(word);
            }
        }
    });
};

// Add legend
const addLegend = (svg, data, x, y, colorScale, onClick) => {
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${x},${y})`);

    const legendItems = legend.selectAll('.legend-item')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0,${i * 20})`)
        .on('click', onClick)
        .style('cursor', 'pointer');

    legendItems.append('rect')
        .attr('class', 'legend-rect')
        .attr('width', 14)
        .attr('height', 14)
        .attr('fill', d => colorScale(d));

    legendItems.append('text')
        .attr('class', 'legend-text')
        .attr('x', 20)
        .attr('y', 7)
        .attr('dominant-baseline', 'middle')
        .text(d => d);

    return legend;
};

// Calculate efficiency score (distance from frontier)
const calculateEfficiency = (data, spendingKey, outcomeKey) => {
    return data.map(d => {
        const spending = d[spendingKey];
        const outcome = d[outcomeKey];

        // Find best outcome at similar or lower spending
        const betterRegions = data.filter(r =>
            r[spendingKey] <= spending && r[outcomeKey] > outcome
        );

        if (betterRegions.length === 0) {
            d.efficient = true;
            d.efficiencyGap = 0;
        } else {
            d.efficient = false;
            const maxOutcome = d3.max(betterRegions, r => r[outcomeKey]);
            d.efficiencyGap = maxOutcome - outcome;
        }

        return d;
    });
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatNumber,
        formatCurrency,
        formatPercent,
        Tooltip,
        tooltip,
        linkedHighlight,
        linearRegression,
        createSVG,
        addGridLines,
        addAnnotation,
        makeAnnotationTextDraggable,
        wrap,
        addLegend,
        calculateEfficiency
    };
}
