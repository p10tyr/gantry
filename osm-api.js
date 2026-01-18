/**
 * OSM API Integration
 * Fetches member data from Online Scout Manager and transforms it for the Gantt chart
 */

// Store user sections
let userSections = [];

/**
 * Load user sections from OAuth user info
 */
async function loadUserSections() {
    try {
        const userInfo = getUserInfo();
        
        if (!userInfo) {
            console.error('No user info available');
            return;
        }

        console.log('User info:', userInfo);
        
        // Extract sections from user info
        // The structure might be: userInfo.sections or userInfo.data.sections
        const sections = userInfo.sections || userInfo.data?.sections || [];
        
        if (sections.length === 0) {
            console.warn('No sections found for user');
            return;
        }

        userSections = sections;
        displaySections(sections);
        
    } catch (error) {
        console.error('Error loading user sections:', error);
    }
}

/**
 * Display sections as checkboxes with term selection
 */
function displaySections(sections) {
    const container = document.getElementById('osm-section-container');
    const listElement = document.getElementById('osm-sections-list');
    const loginPrompt = document.getElementById('osm-login-prompt');
    
    if (!container || !listElement) {
        console.error('Section container not found');
        return;
    }

    // Show section selection, hide login prompt
    container.style.display = 'block';
    if (loginPrompt) loginPrompt.style.display = 'none';

    // Clear existing content
    listElement.innerHTML = '';
    
    // Debug: Log first section to console to help identify correct property names
    if (sections.length > 0) {
        console.log('First Section Object:', sections[0]);
        console.log('Section Keys:', Object.keys(sections[0]));
    }

    // Add checkbox for each section
    sections.forEach(section => {
        const checkbox = document.createElement('div');
        checkbox.className = 'form-check mb-2';
        
        // Try multiple property names for section ID, name and type early
        const sectionId = section.sectionid || section.sectionId || section.section_id || section.id || '';
        const sectionName = section.sectionname || section.name || section.section_name || 'Unknown Section';
        const sectionType = section.section || section.sectionType || section.section_type || section.type || '';

        checkbox.innerHTML = `
            <div class="d-flex align-items-center flex-wrap">
                <input class="form-check-input osm-section-checkbox me-2" type="checkbox" 
                       value="${sectionId}" id="section-${sectionId}"
                       data-section-type="${sectionType}" checked>
                <label class="form-check-label" for="section-${sectionId}">
                    ${sectionName} 
                    <span class="text-muted small">(${sectionType})</span>
                </label>
            </div>
        `;
        listElement.appendChild(checkbox);
    });

    // Add change listener to enable/disable load button
    const checkboxes = document.querySelectorAll('.osm-section-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateLoadButtonState);
    });

    updateLoadButtonState();
}

/**
 * Update load button state based on selected sections
 */
function updateLoadButtonState() {
    const loadBtn = document.getElementById('osm-load-btn');
    const checkboxes = document.querySelectorAll('.osm-section-checkbox:checked');
    
    if (loadBtn) {
        loadBtn.disabled = checkboxes.length === 0;
        loadBtn.title = checkboxes.length === 0 ? 'Select at least one section' : `Load ${checkboxes.length} section(s)`;
    }
}

/**
 * Convert age string (e.g., "9 / 4" = 9 years 4 months) to date of birth
 * @param {string} ageString - Age in format "years / months"
 * @returns {string} Date of birth in YYYY-MM-DD format
 */
function ageToDOB(ageString) {
    if (!ageString || typeof ageString !== 'string') {
        return '';
    }

    // Parse age string (e.g., "9 / 4" means 9 years, 4 months)
    const parts = ageString.split('/').map(s => s.trim());
    const years = parseInt(parts[0]) || 0;
    const months = parseInt(parts[1]) || 0;

    // Calculate DOB by subtracting from today
    const today = new Date();
    const dob = new Date(today);
    dob.setFullYear(today.getFullYear() - years);
    dob.setMonth(today.getMonth() - months);

    // Format as YYYY-MM-DD
    const year = dob.getFullYear();
    const month = String(dob.getMonth() + 1).padStart(2, '0');
    const day = String(dob.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Transform OSM member data to match XLSX format expected by the app
 * @param {Array} osmMembers - Raw member data from OSM API
 * @returns {Array} Transformed data matching XLSX structure
 */
function transformOSMMembers(osmMembers) {
    if (!Array.isArray(osmMembers)) {
        console.error('Invalid OSM members data');
        return [];
    }

    return osmMembers
        .filter(member => {
            // Filter out inactive members
            const isActive = member.active !== false && member.active !== 'false';
            return isActive;
        })
        .map(member => {
            // Calculate DOB from age
            const dob = ageToDOB(member.age);
            
            // Extract patrol name (try multiple property variations)
            const patrol = member.patrol || member.patrolname || member.patrol_name || member.sixname || member.six_name || '';

            return {
                name: member.firstname || member.first_name || '',
                dob: dob,
                patrol: patrol.trim(),
                // Add any other fields that your XLSX format expects
                // You may need to adjust these based on the actual OSM API response
            };
        })
        .filter(member => member.name && member.dob); // Filter out invalid entries
}

/**
 * Fetch member details from OSM
 * @param {string} sectionId - The section ID (default: 29675 for testing)
 * @param {string} termId - The term ID (use -1 for active members)
 * @param {string} section - Section type (e.g., 'cubs', 'scouts', 'beavers')
 * @returns {Promise<Array>} Transformed member data
 */
async function fetchOSMMembers(sectionId = '29675', termId = '-1', section = 'cubs') {
    // Log parameters for debugging
    console.log('fetchOSMMembers called with:', { sectionId, termId, section });
    
    // Use Cloudflare Worker proxy to avoid CORS issues
    const config = getOAuthConfig();
    const url = `${config.apiBase}/members?action=getListOfMembers&sort=dob&sectionid=${sectionId}&termid=${termId}&section=${section}`;

    // Get the access token for Authorization header
    const accessToken = getAccessToken();

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`,  // Include bearer token
            },
            credentials: 'include',  // Include cookies for authentication
        });

        if (!response.ok) {
            throw new Error(`OSM API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OSM API Response:', data);
        
        // The data structure might be different - handle various formats
        let members = data;
        if (data.items) members = data.items;
        else if (data.data) members = data.data;
        else if (Array.isArray(data)) members = data;
        else if (typeof data === 'object') {
            // If it's an object with member IDs as keys
            members = Object.values(data);
        }
        
        // Transform the data to match XLSX format
        const transformedData = transformOSMMembers(members);

        console.log(`Fetched ${transformedData.length} members from OSM`);
        return transformedData;

    } catch (error) {
        console.error('Error fetching OSM members:', error);
        throw error;
    }
}

/**
 * Load OSM data into the application
 * @param {string} sectionId - The section ID
 * @param {string} termId - The term ID  
 */
async function loadFromOSM(sectionId, termId) {
    try {
        // Show loading state
        const statusElement = document.getElementById('data-status');
        if (statusElement) {
            statusElement.textContent = 'Loading data from OSM...';
        }

        // Fetch and transform data
        const members = await fetchOSMMembers(sectionId, termId);

        if (members.length === 0) {
            throw new Error('No members found in OSM response');
        }

        // Add members directly to peopleData (same format as XLSX)
        const formattedPeople = members.map(member => ({
            name: member.name,
            dateOfBirth: member.dob
        }));

        // Append to global peopleData array
        if (typeof peopleData !== 'undefined') {
            peopleData = [...peopleData, ...formattedPeople];
        } else {
            console.error('peopleData array not found');
        }

        // Render the timeline with updated data
        if (typeof renderAll === 'function') {
            renderAll();
        } else {
            console.error('renderAll function not found');
        }

        if (statusElement) {
            statusElement.textContent = `Loaded ${members.length} members from OSM`;
        }

        // Scroll to today after a short delay
        if (typeof scrollToToday === 'function') {
            setTimeout(scrollToToday, 300);
        }

    } catch (error) {
        console.error('Error loading OSM data:', error);
        const statusElement = document.getElementById('data-status');
        if (statusElement) {
            statusElement.textContent = `Error: ${error.message}`;
        }
        alert(`Failed to load OSM data: ${error.message}`);
    }
}

/**
 * Click handler for Load from OSM button
 */
async function loadFromOSMClick() {
    // Get selected sections
    const checkboxes = document.querySelectorAll('.osm-section-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Please select at least one section');
        return;
    }

    const statusElement = document.getElementById('osm-status');
    const loadBtn = document.getElementById('osm-load-btn');
    
    try {
        if (loadBtn) loadBtn.disabled = true;
        if (statusElement) statusElement.textContent = 'Loading...';

        let allMembers = [];

        // Fetch data for each selected section
        for (const checkbox of checkboxes) {
            const sectionId = checkbox.value;
            const sectionType = checkbox.dataset.sectionType;
            
            // Validate sectionId
            if (!sectionId || sectionId === 'undefined') {
                console.error('Invalid section ID for checkbox:', checkbox);
                throw new Error('Section ID is missing. Please try refreshing the page and logging in again.');
            }
            
            // Use -1 for termId to get active members
            const termId = '-1';

            console.log(`Loading section ${sectionId}, term ${termId}, type ${sectionType}`);

            if (statusElement) {
                statusElement.textContent = `Loading ${checkbox.labels[0].textContent.trim().split('(')[0]}...`;
            }

            const members = await fetchOSMMembers(sectionId, termId, sectionType);
            allMembers = allMembers.concat(members);
        }

        if (allMembers.length === 0) {
            throw new Error('No members found in selected sections');
        }

        // Add members directly to peopleData (same format as XLSX)
        const formattedPeople = allMembers.map(member => ({
            name: member.name,
            dateOfBirth: member.dob,
            patrol: member.patrol || ''
        }));

        // Track all unique patrols
        let hasNonePatrol = false;
        formattedPeople.forEach(person => {
            if (person.patrol && typeof activePatrols !== 'undefined') {
                activePatrols.add(person.patrol);
                selectedPatrols.add(person.patrol); // Auto-select new patrols
            } else if (!person.patrol) {
                hasNonePatrol = true;
            }
        });
        
        // Add "None" category for members without patrols
        if (hasNonePatrol && typeof activePatrols !== 'undefined') {
            activePatrols.add('None');
            selectedPatrols.add('None'); // Auto-select None
        }

        // Append to global peopleData array
        if (typeof peopleData !== 'undefined') {
            peopleData = [...peopleData, ...formattedPeople];
            console.log(`Added ${formattedPeople.length} members. Total people: ${peopleData.length}`);
        } else {
            console.error('peopleData array not found');
        }

        // Update patrol filter UI
        if (typeof updatePatrolFilters === 'function') {
            updatePatrolFilters();
        }

        // Render the timeline with updated data
        if (typeof renderAll === 'function') {
            renderAll();
        } else {
            console.error('renderAll function not found');
        }

        if (statusElement) {
            statusElement.textContent = `Loaded ${allMembers.length} members from ${checkboxes.length} section(s) (Total: ${peopleData.length})`;
        }

        // Scroll to today after a short delay
        if (typeof scrollToToday === 'function') {
            setTimeout(scrollToToday, 300);
        }

    } catch (error) {
        console.error('Error loading OSM data:', error);
        if (statusElement) {
            statusElement.textContent = `Error: ${error.message}`;
        }
        alert(`Failed to load OSM data: ${error.message}`);
    } finally {
        if (loadBtn) {
            loadBtn.disabled = false;
        }
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ageToDOB,
        transformOSMMembers,
        fetchOSMMembers,
        loadFromOSM,
        loadFromOSMClick,
        loadUserSections,
        displaySections,
        updateLoadButtonState
    };
}
