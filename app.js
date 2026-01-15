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

// Constants
const YEAR_WIDTH = 100; // pixels per year
const AGE_START = 6;
const AGE_END = 18;
const AGE_GROUPS = {
    beavers: { min: 6, max: 8, color: 'beavers', label: 'Beavers' },
    cubs: { min: 8, max: 10.5, color: 'cubs', label: 'Cubs' },
    scouts: { min: 10.5, max: 14, color: 'scouts', label: 'Scouts' },
    explorers: { min: 14, max: 18, color: 'explorers', label: 'Explorers' }
};

// Default sample data (pre-populated in CSV input)
const DEFAULT_CSV_DATA = `Emma Thompson,2020-03-15
James Wilson,2019-08-22
Sophia Martinez,2018-11-30
Oliver Brown,2017-05-18
Isabella Garcia,2016-09-07
William Davis,2020-01-25
Mia Johnson,2019-04-12
Benjamin Miller,2018-07-08
Charlotte Anderson,2017-12-03
Lucas Taylor,2016-02-28
Amelia Thomas,2015-06-14
Henry Jackson,2014-10-19
Harper White,2013-08-05
Alexander Harris,2012-03-22
Evelyn Clark,2011-11-11
Sebastian Lewis,2020-02-14
Abigail Robinson,2019-06-30
Jack Walker,2018-09-25
Emily Hall,2017-01-17
Daniel Allen,2016-05-09
Elizabeth Young,2015-08-21
Michael King,2014-12-04
Sofia Wright,2013-04-16
David Scott,2012-07-28
Avery Green,2011-02-10
Joseph Baker,2010-09-03
Ella Adams,2009-11-22
Matthew Nelson,2008-04-07
Grace Hill,2021-06-19
Andrew Campbell,2021-01-31
Chloe Mitchell,2019-10-08
Ryan Roberts,2018-03-14
Lily Carter,2017-07-26
Nathan Phillips,2016-11-02
Zoey Evans,2015-02-18
Samuel Turner,2014-05-24
Hannah Torres,2013-09-11
Christopher Parker,2012-12-29
Addison Collins,2011-06-06
Dylan Edwards,2010-08-15
Natalie Stewart,2020-04-20
Isaac Sanchez,2019-01-09
Layla Morris,2018-05-31
Joshua Rogers,2017-10-14
Riley Reed,2016-03-26
Gabriel Cook,2015-07-08
Aubrey Morgan,2014-11-20
Owen Bell,2013-02-05
Scarlett Murphy,2012-09-17
Caleb Bailey,2011-04-29
Aria Rivera,2010-07-12
Elijah Cooper,2009-10-24
Penelope Richardson,2008-01-06
Levi Cox,2021-08-18
Victoria Howard,2021-12-30
Adrian Ward,2019-12-15
Nora Peterson,2018-02-27
Lincoln Gray,2017-06-09
Savannah Ramirez,2016-08-21
Leo James,2015-04-03`;

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
    const turnsCubs = getDateAtAge(dob, 8);      // Beavers -> Cubs at 8
    const turnsScouts = getDateAtAge(dob, 10.5); // Cubs -> Scouts at 10.5
    const turnsExplorers = getDateAtAge(dob, 14); // Scouts -> Explorers at 14
    
    return {
        ...person,
        startDate,
        endDate,
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
        capacity[year] = { total: 0, beavers: 0, cubs: 0, scouts: 0, explorers: 0 };
    }
    
    data.forEach(person => {
        for (let year = settings.startYear; year <= settings.endYear; year++) {
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31);
            
            if (person.startDate <= yearEnd && person.endDate >= yearStart) {
                capacity[year].total++;
                
                // Determine primary age group for this year
                const ageAtYearStart = year - parseDate(person.dateOfBirth).getFullYear();
                if (ageAtYearStart >= 6 && ageAtYearStart < 8) {
                    capacity[year].beavers++;
                } else if (ageAtYearStart >= 8 && ageAtYearStart < 10.5) {
                    capacity[year].cubs++;
                } else if (ageAtYearStart >= 10.5 && ageAtYearStart < 14) {
                    capacity[year].scouts++;
                } else if (ageAtYearStart >= 14 && ageAtYearStart <= 18) {
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
    const chartHeight = 80;
    
    for (let year = settings.startYear; year <= settings.endYear; year++) {
        const data = capacity[year];
        const height = (data.total / maxCount) * chartHeight;
        const isOverCapacity = data.total > settings.maxCapacity;
        const isCurrentYear = year === new Date().getFullYear();
        
        const wrapper = document.createElement('div');
        wrapper.className = 'capacity-bar-wrapper';
        
        const bar = document.createElement('div');
        bar.className = `capacity-bar ${isOverCapacity ? 'over-capacity' : ''}`;
        bar.style.height = `${Math.max(height, 4)}px`;
        bar.title = `${year}: ${data.total} people\nBeavers: ${data.beavers}\nCubs: ${data.cubs}\nScouts: ${data.scouts}\nExplorers: ${data.explorers}`;
        
        const count = document.createElement('div');
        count.className = 'capacity-count';
        count.textContent = data.total;
        
        const yearLabel = document.createElement('div');
        yearLabel.className = 'capacity-year';
        yearLabel.textContent = year;
        if (isCurrentYear) yearLabel.style.fontWeight = 'bold';
        
        wrapper.appendChild(count);
        wrapper.appendChild(bar);
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
    const posCubs = getPositionForDate(person.turnsCubs, settings.startYear) - startPos;
    const posScouts = getPositionForDate(person.turnsScouts, settings.startYear) - startPos;
    const posExplorers = getPositionForDate(person.turnsExplorers, settings.startYear) - startPos;
    
    // Beavers segment (6-8)
    const beaversWidth = Math.max(0, Math.min(posCubs, totalWidth));
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
    const today = new Date();
    const position = getPositionForDate(today, settings.startYear);
    
    if (position >= 0 && position <= (settings.endYear - settings.startYear + 1) * YEAR_WIDTH) {
        marker.style.left = `${position}px`;
        marker.style.display = 'block';
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
    if (person.currentAge >= 6 && person.currentAge < 8) currentSection = 'Beavers';
    else if (person.currentAge >= 8 && person.currentAge < 10.5) currentSection = 'Cubs';
    else if (person.currentAge >= 10.5 && person.currentAge < 14) currentSection = 'Scouts';
    else if (person.currentAge >= 14 && person.currentAge < 18) currentSection = 'Explorers';
    else if (person.currentAge < 6) currentSection = 'Not yet 6';
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
            <span class="tooltip-label">Beavers (6):</span>
            <span>${formatDate(person.startDate)}</span>
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
    
    // Load the data
    peopleData = people;
    
    // Update status
    statusEl.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Loaded ${people.length} people</span>`;
    
    // Render
    renderAll();
    
    // Scroll to today
    setTimeout(scrollToToday, 300);
}

function clearData() {
    document.getElementById('csvDataInput').value = '';
    document.getElementById('data-status').innerHTML = '';
    document.getElementById('error-message').classList.add('d-none');
    
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
// Initialization
// ============================================

function initializeApp() {
    // Hide loading spinner
    document.getElementById('loading').style.display = 'none';
    
    // Pre-populate the CSV input with default data
    document.getElementById('csvDataInput').value = DEFAULT_CSV_DATA;
    
    // Setup scroll sync
    setupScrollSync();
    
    // Auto-load the default data
    loadFromCSV();
}

// Start the app
document.addEventListener('DOMContentLoaded', initializeApp);
