/**
 * OSM API Integration
 * Fetches member data from Online Scout Manager and transforms it for the Gantt chart
 */

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

    return osmMembers.map(member => {
        // Calculate DOB from age
        const dob = ageToDOB(member.age);

        return {
            name: member.firstname || member.first_name || '',
            dob: dob,
            // Add any other fields that your XLSX format expects
            // You may need to adjust these based on the actual OSM API response
        };
    }).filter(member => member.name && member.dob); // Filter out invalid entries
}

/**
 * Fetch member details from OSM
 * @param {string} sectionId - The section ID (default: 29675 for testing)
 * @param {string} termId - The term ID (default: 878820 for testing)
 * @param {string} section - Section type (e.g., 'cubs', 'scouts')
 * @returns {Promise<Array>} Transformed member data
 */
async function fetchOSMMembers(sectionId = '29675', termId = '878820', section = 'cubs') {
    // Use local proxy to avoid CORS issues
    const url = `/api/osm/members?action=getListOfMembers&sort=dob&sectionid=${sectionId}&termid=${termId}&section=${section}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': '*/*',
            },
            credentials: 'include', // Include cookies for authentication
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
 * @param {string} section - Section type (e.g., 'cubs', 'scouts')
 */
async function loadFromOSM(sectionId, termId, section) {
    try {
        // Show loading state
        const statusElement = document.getElementById('data-status');
        if (statusElement) {
            statusElement.textContent = 'Loading data from OSM...';
        }

        // Fetch and transform data
        const members = await fetchOSMMembers(sectionId, termId, section);

        if (members.length === 0) {
            throw new Error('No members found in OSM response');
        }

        // Convert to CSV format that loadFromCSV expects
        let csvData = 'First Name,Date of Birth\n';
        members.forEach(member => {
            csvData += `${member.name},${member.dob}\n`;
        });

        // Use the existing loadFromCSV function to process the data
        if (typeof loadFromCSV === 'function') {
            loadFromCSV(csvData);
        } else {
            console.error('loadFromCSV function not found');
        }

        if (statusElement) {
            statusElement.textContent = `Loaded ${members.length} members from OSM`;
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
function loadFromOSMClick() {
    // For now, use hardcoded test values
    // TODO: Add UI to let user select section/term
    loadFromOSM('29675', '878820', 'cubs');
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ageToDOB,
        transformOSMMembers,
        fetchOSMMembers,
        loadFromOSM,
        loadFromOSMClick
    };
}
