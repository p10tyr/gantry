// ============================================
// Age Group Timeline Planner
// ============================================

// Global state
let peopleData = [];
let settings = {
    startYear: 2020,
    endYear: 2050,
    sortBy: 'startDate',
    filterYear: 'all',
    maxCapacity: 10
};
let visibleSections = {
    squirrels: true,
    beavers: true,
    cubs: true,
    scouts: true,
    explorers: true
};

// Constants
const YEAR_WIDTH = 100; // pixels per year
const AGE_START = 4;
const AGE_END = 18;
const AGE_GROUPS = {
    squirrels: { min: 4, max: 6, color: 'squirrels', label: 'Squirrels' },
    beavers: { min: 6, max: 8, color: 'beavers', label: 'Beavers' },
    cubs: { min: 8, max: 10.5, color: 'cubs', label: 'Cubs' },
    scouts: { min: 10.5, max: 14, color: 'scouts', label: 'Scouts' },
    explorers: { min: 14, max: 18, color: 'explorers', label: 'Explorers' }
};

// Default sample data (pre-populated in CSV input)
const DEFAULT_CSV_DATA = ``;

// ============================================
// Utility Functions
// ============================================

function parseDate(dateString) {
    return new Date(dateString + 'T00:00:00');
}

function formatDate(date) {
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
}

function formatShortDate(dateString) {
    const date = parseDate(dateString);
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: '2-digit' 
    });
}

// Calculate the date when a person reaches a specific age
function getDateAtAge(dob, age) {
    const date = parseDate(dob);
    return new Date(date.getFullYear() + age, date.getMonth(), date.getDate());
}

// Get current age
function calculateAge(dob) {
    const today = new Date();
    const birthDate = parseDate(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Get position in pixels for a date within the timeline
function getPositionForDate(date, startYear) {
    const yearStart = new Date(startYear, 0, 1);
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const yearsDiff = (date - yearStart) / msPerYear;
    return yearsDiff * YEAR_WIDTH;
}

// ============================================
// Data Processing
// ============================================

function processPersonData(person) {
    const dob = person.dateOfBirth;
    const startDate = getDateAtAge(dob, AGE_START);
    const endDate = getDateAtAge(dob, AGE_END);
    const currentAge = calculateAge(dob);
    
    // Calculate transition dates for UK Scouts sections
    const turnsBeavers = getDateAtAge(dob, 6);   // Squirrels -> Beavers at 6
    const turnsCubs = getDateAtAge(dob, 8);      // Beavers -> Cubs at 8
    const turnsScouts = getDateAtAge(dob, 10.5); // Cubs -> Scouts at 10.5
    const turnsExplorers = getDateAtAge(dob, 14); // Scouts -> Explorers at 14
    
    return {
        ...person,
        startDate,
        endDate,
        turnsBeavers,
        turnsCubs,
        turnsScouts,
        turnsExplorers,
        currentAge,
        startYear: startDate.getFullYear(),
        endYear: endDate.getFullYear()
    };
}

function sortPeople(data) {
    const sorted = [...data];
    
    switch (settings.sortBy) {
        case 'startDate':
            sorted.sort((a, b) => a.startDate - b.startDate);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'dob':
            sorted.sort((a, b) => parseDate(a.dateOfBirth) - parseDate(b.dateOfBirth));
            break;
    }
    
    return sorted;
}

function filterPeople(data) {
    if (settings.filterYear === 'all') return data;
    
    const year = parseInt(settings.filterYear);
    return data.filter(person => {
        return person.startYear <= year && person.endYear >= year;
    });
}

// Calculate capacity per year
function calculateCapacity(data) {
    const capacity = {};
    
    for (let year = settings.startYear; year <= settings.endYear; year++) {
        capacity[year] = { total: 0, squirrels: 0, beavers: 0, cubs: 0, scouts: 0, explorers: 0 };
    }
    
    data.forEach(person => {
        for (let year = settings.startYear; year <= settings.endYear; year++) {
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31);
            
            // Determine age at year start
            const birthDate = parseDate(person.dateOfBirth);
            let ageAtYearStart = yearStart.getFullYear() - birthDate.getFullYear();
            const m = yearStart.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && yearStart.getDate() < birthDate.getDate())) {
                ageAtYearStart--;
            }
            
            // Only count if they're in the active age range at year start AND overlap with the year
            if (person.startDate <= yearEnd && person.endDate >= yearStart && ageAtYearStart >= 4 && ageAtYearStart < 18) {
                capacity[year].total++;
                
                if (ageAtYearStart >= 4 && ageAtYearStart < 6) {
                    capacity[year].squirrels++;
                } else if (ageAtYearStart >= 6 && ageAtYearStart < 8) {
                    capacity[year].beavers++;
                } else if (ageAtYearStart >= 8 && ageAtYearStart < 10.5) {
                    capacity[year].cubs++;
                } else if (ageAtYearStart >= 10.5 && ageAtYearStart < 14) {
                    capacity[year].scouts++;
                } else if (ageAtYearStart >= 14 && ageAtYearStart < 18) {
                    capacity[year].explorers++;
                }
            }
        }
    });
    
    return capacity;
}

// ============================================
// Rendering Functions
// ============================================

function renderCapacityChart(capacity) {
    const container = document.getElementById('capacity-chart');
    container.innerHTML = '';
    
    const maxCount = Math.max(...Object.values(capacity).map(c => c.total), settings.maxCapacity);
    const chartHeight = 320;
    
    for (let year = settings.startYear; year <= settings.endYear; year++) {
        const data = capacity[year];
        const height = (data.total / maxCount) * chartHeight;
        const isOverCapacity = data.total > settings.maxCapacity;
        const isCurrentYear = year === new Date().getFullYear();
        
        const wrapper = document.createElement('div');
        wrapper.className = 'capacity-bar-wrapper';
        
        // Create stacked bar with sections
        const bar = document.createElement('div');
        bar.className = `capacity-bar ${isOverCapacity ? 'over-capacity' : ''}`;
        bar.style.height = `${Math.max(height, 4)}px`;
        bar.style.position = 'relative';
        
        // Create tooltip with breakdown
        const tooltipText = `${year}: ${data.total} people
Squirrels (4-6): ${data.squirrels}
Beavers (6-8): ${data.beavers}
Cubs (8-10½): ${data.cubs}
Scouts (10½-14): ${data.scouts}
Explorers (14-18): ${data.explorers}`;
        bar.title = tooltipText;
        
        // Add segments if there are people
        if (data.total > 0) {
            const sections = [
                { name: 'squirrels', count: data.squirrels, color: 'var(--squirrels-color)' },
                { name: 'beavers', count: data.beavers, color: 'var(--beavers-color)' },
                { name: 'cubs', count: data.cubs, color: 'var(--cubs-color)' },
                { name: 'scouts', count: data.scouts, color: 'var(--scouts-color)' },
                { name: 'explorers', count: data.explorers, color: 'var(--explorers-color)' }
            ];
            
            sections.forEach(section => {
                if (section.count > 0) {
                    const segmentHeight = (section.count / data.total) * 100;
                    const segment = document.createElement('div');
                    segment.className = `capacity-segment capacity-segment-${section.name}`;
                    segment.style.height = `${segmentHeight}%`;
                    segment.style.backgroundColor = `var(--${section.name}-color)`;
                    bar.appendChild(segment);
                }
            });
        }
        
        const count = document.createElement('div');
        count.className = 'capacity-count';
        count.innerHTML = `<div>${data.total}</div>`;
        
        // Add section breakdown below total count
        const breakdown = document.createElement('div');
        breakdown.className = 'capacity-breakdown';
        breakdown.innerHTML = `
            <div class="breakdown-item" style="color: var(--squirrels-color);">S:${data.squirrels}</div>
            <div class="breakdown-item" style="color: var(--beavers-color);">B:${data.beavers}</div>
            <div class="breakdown-item" style="color: var(--cubs-color);">C:${data.cubs}</div>
            <div class="breakdown-item" style="color: var(--scouts-color);">Sc:${data.scouts}</div>
            <div class="breakdown-item" style="color: var(--explorers-color);">E:${data.explorers}</div>
        `;
        
        const yearLabel = document.createElement('div');
        yearLabel.className = 'capacity-year';
        yearLabel.textContent = year;
        if (isCurrentYear) yearLabel.style.fontWeight = 'bold';
        
        wrapper.appendChild(count);
        wrapper.appendChild(bar);
        wrapper.appendChild(breakdown);
        wrapper.appendChild(yearLabel);
        container.appendChild(wrapper);
    }
}

function renderGanttHeader() {
    const header = document.getElementById('gantt-header');
    header.innerHTML = '';
    
    const currentYear = new Date().getFullYear();
    
    for (let year = settings.startYear; year <= settings.endYear; year++) {
        const yearDiv = document.createElement('div');
        yearDiv.className = `gantt-year ${year === currentYear ? 'current-year' : ''}`;
        yearDiv.innerHTML = `
            <span>${year}</span>
            <span class="gantt-year-months">Jan - Dec</span>
        `;
        header.appendChild(yearDiv);
    }
}

function renderGanttSidebar(data) {
    const sidebar = document.getElementById('gantt-sidebar-body');
    sidebar.innerHTML = '';
    
    data.forEach(person => {
        const row = document.createElement('div');
        row.className = 'gantt-sidebar-row';
        row.innerHTML = `
            <div class="name-cell" title="${person.name}">${person.name}</div>
            <div class="dob-cell">${formatShortDate(person.dateOfBirth)}</div>
        `;
        sidebar.appendChild(row);
    });
}

function renderGanttBody(data) {
    const body = document.getElementById('gantt-body');
    body.innerHTML = '';
    
    const currentYear = new Date().getFullYear();
    const totalYears = settings.endYear - settings.startYear + 1;
    
    data.forEach(person => {
        const row = document.createElement('div');
        row.className = 'gantt-row';
        row.style.width = `${totalYears * YEAR_WIDTH}px`;
        
        // Add year cells (for grid lines)
        for (let year = settings.startYear; year <= settings.endYear; year++) {
            const cell = document.createElement('div');
            cell.className = `gantt-cell ${year === currentYear ? 'current-year-cell' : ''}`;
            row.appendChild(cell);
        }
        
        // Add timeline bar
        const bar = createTimelineBar(person);
        if (bar) {
            row.appendChild(bar);
        }
        
        body.appendChild(row);
    });
    
    // Position today marker
    positionTodayMarker();
}

function createTimelineBar(person) {
    const startPos = getPositionForDate(person.startDate, settings.startYear);
    const endPos = getPositionForDate(person.endDate, settings.startYear);
    
    // Check if bar is visible in current range
    if (endPos < 0 || startPos > (settings.endYear - settings.startYear + 1) * YEAR_WIDTH) {
        return null;
    }
    
    const bar = document.createElement('div');
    bar.className = 'timeline-bar';
    bar.style.left = `${Math.max(startPos, 0)}px`;
    bar.style.width = `${Math.min(endPos, (settings.endYear - settings.startYear + 1) * YEAR_WIDTH) - Math.max(startPos, 0)}px`;
    
    // Calculate segment positions for UK Scouts sections
    const totalWidth = endPos - startPos;
    const posBeavers = getPositionForDate(person.turnsBeavers, settings.startYear) - startPos;
    const posCubs = getPositionForDate(person.turnsCubs, settings.startYear) - startPos;
    const posScouts = getPositionForDate(person.turnsScouts, settings.startYear) - startPos;
    const posExplorers = getPositionForDate(person.turnsExplorers, settings.startYear) - startPos;
    
    // Squirrels segment (4-6)
    const squirrelsWidth = Math.max(0, Math.min(posBeavers, totalWidth));
    if (squirrelsWidth > 0) {
        const segment = document.createElement('div');
        segment.className = 'bar-segment squirrels';
        segment.style.width = `${(squirrelsWidth / totalWidth) * 100}%`;
        const label = document.createElement('span');
        label.className = 'segment-label';
        label.textContent = 'Squirrels';
        segment.appendChild(label);
        bar.appendChild(segment);
    }
    
    // Beavers segment (6-8)
    const beaversStart = Math.max(0, posBeavers);
    const beaversWidth = Math.max(0, Math.min(posCubs, totalWidth) - beaversStart);
    if (beaversWidth > 0) {
        const segment = document.createElement('div');
        segment.className = 'bar-segment beavers';
        segment.style.width = `${(beaversWidth / totalWidth) * 100}%`;
        const label = document.createElement('span');
        label.className = 'segment-label';
        label.textContent = 'Beavers';
        segment.appendChild(label);
        bar.appendChild(segment);
    }
    
    // Cubs segment (8-10.5)
    const cubsStart = Math.max(0, posCubs);
    const cubsWidth = Math.max(0, Math.min(posScouts, totalWidth) - cubsStart);
    if (cubsWidth > 0) {
        const segment = document.createElement('div');
        segment.className = 'bar-segment cubs';
        segment.style.width = `${(cubsWidth / totalWidth) * 100}%`;
        const label = document.createElement('span');
        label.className = 'segment-label';
        label.textContent = 'Cubs';
        segment.appendChild(label);
        bar.appendChild(segment);
    }
    
    // Scouts segment (10.5-14)
    const scoutsStart = Math.max(0, posScouts);
    const scoutsWidth = Math.max(0, Math.min(posExplorers, totalWidth) - scoutsStart);
    if (scoutsWidth > 0) {
        const segment = document.createElement('div');
        segment.className = 'bar-segment scouts';
        segment.style.width = `${(scoutsWidth / totalWidth) * 100}%`;
        const label = document.createElement('span');
        label.className = 'segment-label';
        label.textContent = 'Scouts';
        segment.appendChild(label);
        bar.appendChild(segment);
    }
    
    // Explorers segment (14-18)
    const explorersStart = Math.max(0, posExplorers);
    const explorersWidth = Math.max(0, totalWidth - explorersStart);
    if (explorersWidth > 0) {
        const segment = document.createElement('div');
        segment.className = 'bar-segment explorers';
        segment.style.width = `${(explorersWidth / totalWidth) * 100}%`;
        const label = document.createElement('span');
        label.className = 'segment-label';
        label.textContent = 'Explorers';
        segment.appendChild(label);
        bar.appendChild(segment);
    }
    
    // Add tooltip events
    bar.addEventListener('mouseenter', (e) => showTooltip(e, person));
    bar.addEventListener('mousemove', (e) => moveTooltip(e));
    bar.addEventListener('mouseleave', hideTooltip);
    
    return bar;
}

function positionTodayMarker() {
    const marker = document.getElementById('today-marker');
    const ganttBody = document.getElementById('gantt-body');
    const today = new Date();
    const position = getPositionForDate(today, settings.startYear);
    
    if (position >= 0 && position <= (settings.endYear - settings.startYear + 1) * YEAR_WIDTH) {
        marker.style.left = `${position}px`;
        marker.style.display = 'block';
        // Set height to match the gantt body content height plus one row height to reach the bottom
        marker.style.height = `${ganttBody.scrollHeight + 36}px`;
    } else {
        marker.style.display = 'none';
    }
}

// ============================================
// Tooltip Functions
// ============================================

function showTooltip(event, person) {
    const tooltip = document.getElementById('tooltip');
    
    // Determine current section based on UK Scouts age ranges
    let currentSection = '';
    if (person.currentAge >= 4 && person.currentAge < 6) currentSection = 'Squirrels';
    else if (person.currentAge >= 6 && person.currentAge < 8) currentSection = 'Beavers';
    else if (person.currentAge >= 8 && person.currentAge < 10.5) currentSection = 'Cubs';
    else if (person.currentAge >= 10.5 && person.currentAge < 14) currentSection = 'Scouts';
    else if (person.currentAge >= 14 && person.currentAge < 18) currentSection = 'Explorers';
    else if (person.currentAge < 4) currentSection = 'Not yet 4';
    else currentSection = 'Aged out';
    
    tooltip.innerHTML = `
        <div class="tooltip-title">${person.name}</div>
        <div class="tooltip-row">
            <span class="tooltip-label">Date of Birth:</span>
            <span>${formatDate(parseDate(person.dateOfBirth))}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Current Age:</span>
            <span>${person.currentAge} years (${currentSection})</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Squirrels (4):</span>
            <span>${formatDate(person.startDate)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Beavers (6):</span>
            <span>${formatDate(person.turnsBeavers)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Cubs (8):</span>
            <span>${formatDate(person.turnsCubs)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Scouts (10½):</span>
            <span>${formatDate(person.turnsScouts)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Explorers (14):</span>
            <span>${formatDate(person.turnsExplorers)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Ages out (18):</span>
            <span>${formatDate(person.endDate)}</span>
        </div>
    `;
    
    tooltip.classList.add('visible');
    moveTooltip(event);
}

function moveTooltip(event) {
    const tooltip = document.getElementById('tooltip');
    const padding = 15;
    
    let x = event.clientX + padding;
    let y = event.clientY + padding;
    
    // Keep tooltip in viewport
    const rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) {
        x = event.clientX - rect.width - padding;
    }
    if (y + rect.height > window.innerHeight) {
        y = event.clientY - rect.height - padding;
    }
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

function hideTooltip() {
    document.getElementById('tooltip').classList.remove('visible');
}

// ============================================
// Gap Finder
// ============================================

function findGaps() {
    const targetYear = parseInt(document.getElementById('targetYear').value);
    const neededPeople = parseInt(document.getElementById('neededPeople').value);
    const resultsDiv = document.getElementById('gap-results');
    
    // Calculate capacity for target year
    const capacity = calculateCapacity(peopleData.map(processPersonData));
    const currentCapacity = capacity[targetYear]?.total || 0;
    const available = settings.maxCapacity - currentCapacity;
    
    // Find birth date range that would have people turn 6 (start Beavers) in target year
    const birthYearStart = targetYear - 6;
    const birthYearEnd = birthYearStart;
    
    // Check neighboring years too
    const suggestions = [];
    
    for (let year = targetYear - 2; year <= targetYear + 2; year++) {
        const cap = capacity[year]?.total || 0;
        const slots = settings.maxCapacity - cap;
        if (slots > 0) {
            const birthYear = year - 6;  // Age 6 = start of Beavers
            suggestions.push({
                startYear: year,
                birthYear: birthYear,
                availableSlots: slots,
                birthRangeStart: `1 Jan ${birthYear}`,
                birthRangeEnd: `31 Dec ${birthYear}`
            });
        }
    }
    
    if (suggestions.length === 0) {
        resultsDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                No gaps found in years ${targetYear - 2} to ${targetYear + 2}. 
                All years are at or over capacity (${settings.maxCapacity}).
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="alert alert-info mb-3">
            <i class="bi bi-info-circle me-2"></i>
            To have someone start Beavers in <strong>${targetYear}</strong>, they need to be born in <strong>${birthYearStart}</strong> 
            (turning 6 that year). Current capacity for ${targetYear}: <strong>${currentCapacity}/${settings.maxCapacity}</strong>
        </div>
    `;
    
    html += '<div class="row g-2">';
    suggestions.forEach(s => {
        const isFull = s.availableSlots <= 0;
        const isTarget = s.startYear === targetYear;
        html += `
            <div class="col-md-6">
                <div class="gap-suggestion ${isTarget ? 'border-primary border-2' : ''}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong>Start Year: ${s.startYear}</strong>
                        <span class="badge ${s.availableSlots > 0 ? 'bg-success' : 'bg-danger'}">
                            ${s.availableSlots} slot${s.availableSlots !== 1 ? 's' : ''} available
                        </span>
                    </div>
                    <div class="small text-muted">
                        <i class="bi bi-calendar me-1"></i>
                        Birth date range: <strong>${s.birthRangeStart}</strong> to <strong>${s.birthRangeEnd}</strong>
                    </div>
                    ${s.availableSlots >= neededPeople ? 
                        `<div class="text-success mt-1 small"><i class="bi bi-check-circle me-1"></i>Can accommodate ${neededPeople} people</div>` : 
                        s.availableSlots > 0 ?
                        `<div class="text-warning mt-1 small"><i class="bi bi-exclamation-circle me-1"></i>Only ${s.availableSlots} of ${neededPeople} needed</div>` :
                        `<div class="text-danger mt-1 small"><i class="bi bi-x-circle me-1"></i>No slots available</div>`
                    }
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    resultsDiv.innerHTML = html;
}

// ============================================
// User Interactions
// ============================================

function applySettings() {
    settings.startYear = parseInt(document.getElementById('startYear').value);
    settings.endYear = parseInt(document.getElementById('endYear').value);
    settings.sortBy = document.getElementById('sortBy').value;
    settings.filterYear = document.getElementById('filterYear').value;
    settings.maxCapacity = parseInt(document.getElementById('maxCapacity').value);
    
    renderAll();
}

function toggleSection(section) {
    visibleSections[section] = !visibleSections[section];
    
    // Update legend item styling
    const legendItem = document.querySelector(`.legend-item[data-section="${section}"]`);
    if (visibleSections[section]) {
        legendItem.style.opacity = '1';
        legendItem.style.textDecoration = 'none';
    } else {
        legendItem.style.opacity = '0.4';
        legendItem.style.textDecoration = 'line-through';
    }
    
    // Update timeline segments visibility - use opacity instead of display to preserve layout
    const segments = document.querySelectorAll(`.bar-segment.${section}`);
    segments.forEach(segment => {
        if (visibleSections[section]) {
            segment.style.opacity = '1';
            segment.style.visibility = 'visible';
        } else {
            segment.style.opacity = '0';
            segment.style.visibility = 'hidden';
        }
    });
}

function scrollToToday() {
    const ganttMain = document.getElementById('gantt-main');
    const today = new Date();
    const position = getPositionForDate(today, settings.startYear);
    
    ganttMain.scrollTo({
        left: position - ganttMain.clientWidth / 2,
        behavior: 'smooth'
    });
}

function populateFilterYears() {
    const select = document.getElementById('filterYear');
    select.innerHTML = '<option value="all">Show All</option>';
    
    for (let year = settings.startYear; year <= settings.endYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === new Date().getFullYear()) {
            option.textContent += ' (current)';
        }
        select.appendChild(option);
    }
}

// Sync sidebar and main scrolling
function setupScrollSync() {
    const main = document.getElementById('gantt-main');
    const sidebar = document.getElementById('gantt-sidebar-body');
    
    main.addEventListener('scroll', () => {
        sidebar.scrollTop = main.scrollTop;
    });
    
    sidebar.addEventListener('scroll', () => {
        main.scrollTop = sidebar.scrollTop;
    });
}

// ============================================
// Main Render Function
// ============================================

function renderAll() {
    // Process and filter data
    let processed = peopleData.map(processPersonData);
    processed = filterPeople(processed);
    processed = sortPeople(processed);
    
    // Update person count
    document.getElementById('person-count').textContent = `${processed.length} people`;
    
    // Calculate capacity
    const capacity = calculateCapacity(peopleData.map(processPersonData));
    
    // Render components
    renderCapacityChart(capacity);
    renderGanttHeader();
    renderGanttSidebar(processed);
    renderGanttBody(processed);
    
    // Populate filter dropdown
    populateFilterYears();
}

// ============================================
// CSV Data Functions
// ============================================

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const people = [];
    const errors = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return; // Skip empty lines
        
        // Split by comma, but handle potential quoted values
        const parts = trimmedLine.split(',');
        
        if (parts.length < 2) {
            errors.push(`Line ${index + 1}: Invalid format - expected "Name,YYYY-MM-DD"`);
            return;
        }
        
        const name = parts[0].trim();
        const dateOfBirth = parts[1].trim();
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
            errors.push(`Line ${index + 1}: Invalid date format "${dateOfBirth}" - use YYYY-MM-DD`);
            return;
        }
        
        // Validate the date is actually valid
        const testDate = new Date(dateOfBirth);
        if (isNaN(testDate.getTime())) {
            errors.push(`Line ${index + 1}: Invalid date "${dateOfBirth}"`);
            return;
        }
        
        people.push({ name, dateOfBirth });
    });
    
    return { people, errors };
}

function loadFromCSV() {
    const csvInput = document.getElementById('csvDataInput');
    const statusEl = document.getElementById('data-status');
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    // Hide previous errors
    errorDiv.classList.add('d-none');
    
    const csvText = csvInput.value.trim();
    
    if (!csvText) {
        statusEl.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>No data to load</span>';
        return;
    }
    
    const { people, errors } = parseCSV(csvText);
    
    if (errors.length > 0) {
        errorDiv.classList.remove('d-none');
        errorText.innerHTML = `<strong>CSV Parsing Errors:</strong><br>${errors.slice(0, 5).join('<br>')}${errors.length > 5 ? `<br>... and ${errors.length - 5} more errors` : ''}`;
    }
    
    if (people.length === 0) {
        statusEl.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>No valid entries found</span>';
        return;
    }
    
    // Append the data (not replace)
    const previousCount = peopleData.length;
    peopleData = [...peopleData, ...people];
    
    // Update status
    statusEl.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Loaded ${people.length} people (Total: ${peopleData.length})</span>`;
    
    // Render
    renderAll();
    
    // Scroll to today
    setTimeout(scrollToToday, 300);
}

function clearData() {
    document.getElementById('csvDataInput').value = '';
    document.getElementById('data-status').innerHTML = '';
    document.getElementById('xlsx-status').innerHTML = '';
    document.getElementById('error-message').classList.add('d-none');
    document.getElementById('xlsxFileInput').value = '';
    
    peopleData = [];
    renderAll();
}

function downloadCSV() {
    const csvInput = document.getElementById('csvDataInput');
    const csvContent = csvInput.value.trim();
    
    if (!csvContent) {
        alert('No data to download');
        return;
    }
    
    // Add header row
    const csvWithHeader = 'Name,DateOfBirth\n' + csvContent;
    
    const blob = new Blob([csvWithHeader], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'scouts_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// XLSX File Handling
// ============================================

function parseXLSXData(arrayBuffer) {
    try {
        // Read the workbook
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        const people = [];
        const errors = [];
        
        rawData.forEach((row, index) => {
            // Try different possible column name variations (case-insensitive search)
            let firstName = null;
            let dob = null;
            
            // Find first name column (case-insensitive)
            const firstNameKey = Object.keys(row).find(key => 
                key.toLowerCase().replace(/\s+/g, '') === 'firstname'
            );
            if (firstNameKey) firstName = row[firstNameKey];
            
            // Find date of birth column (case-insensitive)
            const dobKey = Object.keys(row).find(key => {
                const normalized = key.toLowerCase().replace(/\s+/g, '');
                return normalized === 'dateofbirth' || normalized === 'dob';
            });
            if (dobKey) dob = row[dobKey];
            
            if (!firstName || !dob) {
                const availableColumns = Object.keys(row).filter(k => k !== null && k !== undefined);
                errors.push(`Row ${index + 2}: Missing required columns. Found: ${availableColumns.join(', ')}`);
                return;
            }
            
            // Clean up the name
            firstName = String(firstName).trim();
            
            // Handle various date formats
            let dateOfBirth = '';
            
            if (typeof dob === 'number') {
                // Excel date serial number
                const excelEpoch = new Date(1900, 0, 1);
                const date = new Date(excelEpoch.getTime() + (dob - 2) * 24 * 60 * 60 * 1000);
                dateOfBirth = formatDateToISO(date);
            } else {
                // String format - try to parse
                dateOfBirth = parseDateString(String(dob).trim());
            }
            
            // Validate the date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
                errors.push(`Row ${index + 2}: Invalid date format for ${firstName} - expected YYYY-MM-DD, got "${dob}"`);
                return;
            }
            
            // Validate the date is actually valid
            const testDate = new Date(dateOfBirth);
            if (isNaN(testDate.getTime())) {
                errors.push(`Row ${index + 2}: Invalid date "${dateOfBirth}" for ${firstName}`);
                return;
            }
            
            people.push({ name: firstName, dateOfBirth });
        });
        
        return { people, errors };
    } catch (error) {
        return { people: [], errors: [`Failed to parse XLSX file: ${error.message}`] };
    }
}

function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateString(dateStr) {
    // Try various date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.
    
    // First try ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Try DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        if (parts[0].length <= 2 && parts[1].length <= 2) {
            // Assume DD/MM/YYYY format
            const day = String(parts[0]).padStart(2, '0');
            const month = String(parts[1]).padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Try MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        if (parts[1].length <= 2) {
            const month = String(parts[0]).padStart(2, '0');
            const day = String(parts[1]).padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Try DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        if (parts[0].length <= 2 && parts[1].length <= 2) {
            const day = String(parts[0]).padStart(2, '0');
            const month = String(parts[1]).padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    return dateStr; // Return as-is if unable to parse
}

function handleXLSXFileSelect() {
    const fileInput = document.getElementById('xlsxFileInput');
    const files = fileInput.files;
    const statusEl = document.getElementById('xlsx-status');
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (files.length === 0) {
        return;
    }
    
    // Hide previous errors
    errorDiv.classList.add('d-none');
    
    let totalPeopleLoaded = 0;
    let allErrors = [];
    
    // Process each file
    let filesProcessed = 0;
    
    Array.from(files).forEach((file, fileIndex) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const { people, errors } = parseXLSXData(arrayBuffer);
            
            if (errors.length > 0) {
                allErrors = allErrors.concat(errors.map(err => `[${file.name}] ${err}`));
            }
            
            // Append the data
            totalPeopleLoaded += people.length;
            peopleData = [...peopleData, ...people];
            
            filesProcessed++;
            
            // When all files are processed
            if (filesProcessed === files.length) {
                if (allErrors.length > 0) {
                    errorDiv.classList.remove('d-none');
                    errorText.innerHTML = `<strong>XLSX Parsing Errors:</strong><br>${allErrors.slice(0, 5).join('<br>')}${allErrors.length > 5 ? `<br>... and ${allErrors.length - 5} more errors` : ''}`;
                }
                
                if (totalPeopleLoaded === 0) {
                    statusEl.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>No valid entries found</span>';
                } else {
                    statusEl.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Loaded ${totalPeopleLoaded} people from ${files.length} file(s) (Total: ${peopleData.length})</span>`;
                    renderAll();
                    setTimeout(scrollToToday, 300);
                }
                
                // Reset file input
                fileInput.value = '';
            }
        };
        
        reader.onerror = () => {
            allErrors.push(`[${file.name}] Failed to read file`);
            filesProcessed++;
            
            if (filesProcessed === files.length) {
                errorDiv.classList.remove('d-none');
                errorText.innerHTML = `<strong>Error:</strong><br>${allErrors.join('<br>')}`;
                fileInput.value = '';
            }
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// ============================================
// Previous CSV Functions (unchanged)
// ============================================

// ============================================
// Initialization
// ============================================

function initializeApp() {
    // Hide loading spinner
    document.getElementById('loading').style.display = 'none';
    
    // Setup XLSX file input listener
    const xlsxFileInput = document.getElementById('xlsxFileInput');
    if (xlsxFileInput) {
        xlsxFileInput.addEventListener('change', handleXLSXFileSelect);
    }
    
    // Pre-populate the CSV input with default data
    document.getElementById('csvDataInput').value = DEFAULT_CSV_DATA;
    
    // Setup scroll sync
    setupScrollSync();
    
    // Auto-load the default data
    loadFromCSV();
}

// Start the app
document.addEventListener('DOMContentLoaded', initializeApp);
