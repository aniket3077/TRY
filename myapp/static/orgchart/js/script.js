$(document).ready(function() {
    // Global variable to hold the organization data
    let orgData = { nodes: [] };
    
    // Preview mode detection
    const isPreviewMode = document.body.hasAttribute('data-preview-mode') || 
                         window.location.pathname.includes('/preview-chart/') ||
                         document.querySelector('[data-preview-mode]') !== null;
    
    // Function to generate blurred data for sensitive fields
    function generateBlurredPersonDetails(personId) {
        return {
            name: `<span class="blurred-text">████ ████</span>`,
            email_id: `<span class="blurred-text">████████@████████.com</span>`,
            boardline_number: `<span class="blurred-text">+91 ████ ████ ████</span>`,
            primary_address: `<span class="blurred-text">████████, ████████, ████████</span>`,
            domain: `<span class="blurred-text">████████.com</span>`,
            linkedin: `<span class="blurred-text">linkedin.com/in/████████</span>`,
            facebook: `<span class="blurred-text">facebook.com/████████</span>`,
            x: `<span class="blurred-text">@████████</span>`,
            other: `<span class="blurred-text">████████</span>`,
            // Location data
            city: `<span class="blurred-text">████████</span>`,
            state: `<span class="blurred-text">████████</span>`,
            country: `<span class="blurred-text">████████</span>`,
            postal_code: `<span class="blurred-text">██████</span>`
        };
    }

    // Image caching and lazy loading configuration
    const IMAGE_CONFIG = {
        cache: new Map(), // In-memory cache for loaded images
        placeholderSvg: `data:image/svg+xml;base64,${btoa(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" fill="#f0f0f0"/>
                <circle cx="20" cy="15" r="5" fill="#ddd"/>
                <path d="M10 30 Q20 25 30 30" stroke="#ddd" stroke-width="2" fill="none"/>
            </svg>
        `)}`,
        loadingSvg: `data:image/svg+xml;base64,${btoa(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" fill="#f8f9fa"/>
                <circle cx="20" cy="20" r="8" fill="none" stroke="#007bff" stroke-width="2">
                    <animate attributeName="stroke-dasharray" values="0 50;25 25;0 50" dur="1s" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" values="0;-25;-50" dur="1s" repeatCount="indefinite"/>
                </circle>
            </svg>
        `)}`,
        errorSvg: `data:image/svg+xml;base64,${btoa(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" fill="#f8f9fa"/>
                <path d="M20 5 L35 35 L5 35 Z" fill="#dc3545"/>
                <text x="20" y="25" fill="white" text-anchor="middle" font-size="16">!</text>
            </svg>
        `)}`
    };

    // Lazy loading observer
    let imageObserver = null;

    // Initialize image lazy loading
    function initializeLazyLoading() {
        if ('IntersectionObserver' in window) {
            imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        loadImageLazily(img);
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px', // Start loading 50px before the image comes into view
                threshold: 0.01
            });
        }
    }

    // Function to load image with caching
    async function loadImageWithCache(src) {
        if (!src || src.trim() === '') {
            return IMAGE_CONFIG.placeholderSvg;
        }

        // Check cache first
        if (IMAGE_CONFIG.cache.has(src)) {
            return IMAGE_CONFIG.cache.get(src);
        }

        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                // Cache the successful load
                IMAGE_CONFIG.cache.set(src, src);
                resolve(src);
            };
            
            img.onerror = () => {
                // Cache the error to avoid repeated failed attempts
                IMAGE_CONFIG.cache.set(src, IMAGE_CONFIG.errorSvg);
                resolve(IMAGE_CONFIG.errorSvg);
            };
            
            img.src = src;
        });
    }    // Function to load image lazily
    async function loadImageLazily(imgElement) {
        const src = imgElement.dataset.src;
        if (!src) return;

        // If already loaded or loading, skip
        if (imgElement.classList.contains('loaded') || imgElement.classList.contains('loading')) {
            return;
        }

        // Add loading class to prevent duplicate loads
        imgElement.classList.add('loading');
        
        // Show loading state
        imgElement.src = IMAGE_CONFIG.loadingSvg;
        
        try {
            const loadedSrc = await loadImageWithCache(src);
            imgElement.src = loadedSrc;
            imgElement.classList.remove('loading');
            imgElement.classList.add('loaded');
        } catch (error) {
            console.error('Error loading image:', error);
            imgElement.src = IMAGE_CONFIG.errorSvg;
            imgElement.classList.remove('loading');
            imgElement.classList.add('error');
        }
    }

    // Function to create lazy image element
    function createLazyImage(src, className = '', alt = '') {
        if (!src || src.trim() == '') {
            return `<img src="${IMAGE_CONFIG.placeholderSvg}" class="${className} placeholder" alt="${alt}" />`;
        }

        return `<img src="${IMAGE_CONFIG.loadingSvg}" 
                     data-src="${src}" 
                     class="${className} lazy-image" 
                     alt="${alt}" 
                     loading="lazy" />`;
    }    // Function to observe lazy images
    function observeLazyImages() {
        if (imageObserver) {
            const lazyImages = document.querySelectorAll('.lazy-image:not(.loaded):not(.error):not(.loading)');
            lazyImages.forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            const lazyImages = document.querySelectorAll('.lazy-image:not(.loaded):not(.error):not(.loading)');
            lazyImages.forEach(img => {
                loadImageLazily(img);
            });
        }
        
        // Also handle images that are already in viewport but haven't loaded
        const visibleImages = document.querySelectorAll('.lazy-image:not(.loaded):not(.error):not(.loading)');
        visibleImages.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                // Image is in viewport, load it immediately
                loadImageLazily(img);
            }
        });
    }// Function to preload critical images
    function preloadCriticalImages() {
        // Preload first few visible images
        const criticalImages = Array.from(document.querySelectorAll('.lazy-image')).slice(0, 5);
        criticalImages.forEach(img => {
            if (img.dataset.src) {
                loadImageWithCache(img.dataset.src);
            }
        });
    }

    // Function to clear image cache
    function clearImageCache() {
        IMAGE_CONFIG.cache.clear();
    }

    // Function to retry failed images
    function retryFailedImages() {
        const failedImages = document.querySelectorAll('.lazy-image.error');
        failedImages.forEach(img => {
            img.classList.remove('error');
            if (img.dataset.src) {
                // Remove from cache to force retry
                IMAGE_CONFIG.cache.delete(img.dataset.src);
                loadImageLazily(img);
            }
        });
    }

    // Function to get cache statistics
    function getImageCacheStats() {
        const stats = {
            totalCached: IMAGE_CONFIG.cache.size,
            cacheEntries: Array.from(IMAGE_CONFIG.cache.entries())
        };
        return stats;
    }

    // API Configuration
    const API_CONFIG = {
        apiUrl: '/api/request/chart/',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    };

    function getChartIdFromBody() {
        // Try to get chart ID from the chart container first
        const container = document.getElementById('chart-container');
        if (container && container.dataset && container.dataset.chartId) {
            return container.dataset.chartId;
        }

        // Fallback to body attributes
        const body = document.body;
        if (!body) return null;
        if (body.dataset && body.dataset.chartId) return body.dataset.chartId;
        if (body.dataset && body.dataset.chartid) return body.dataset.chartid;
        return body.getAttribute('data-chart-id') || body.getAttribute('data-chartid') || null;
    }

    // Get CSRF token from cookie 
    function getCSRFToken() {
        // Try to get from meta tag first
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            const token = metaTag.getAttribute('content');
            if (token) {
                console.log('Found CSRF token in meta tag');
                return token;
            }
        }

        // Fallback to cookie
        const name = 'csrftoken';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                const token = decodeURIComponent(cookie.substring(name.length + 1));
                console.log('Found CSRF token in cookie');
                return token;
            }
        }
        console.warn('No CSRF token found');
        return '';
    }

    // Update API_CONFIG to include CSRF token in headers
    function updateAPIHeaders() {
        const csrftoken = getCSRFToken();
        if (csrftoken) {
            API_CONFIG.headers['X-CSRFToken'] = csrftoken;
            console.log('Added CSRF token to headers');
        } else {
            console.warn('No CSRF token available for headers');
        }
    }
    
    // Initialize headers
    updateAPIHeaders();

    // Function to make API request with retries
    async function makeAPIRequest(data, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                // Update headers before each attempt
                updateAPIHeaders();
                
                const response = await fetch(API_CONFIG.apiUrl, {
                    method: 'POST',
                    headers: API_CONFIG.headers,
                    body: JSON.stringify(data),
                    credentials: 'same-origin'  // Include cookies in request
                });
                
                if (response.ok) {
                    return await response.json();
                }
                
                // If we get a 403, try updating the CSRF token
                if (response.status === 403) {
                    console.log(`Attempt ${i + 1}: Got 403, updating CSRF token`);
                    continue;  // Try again with updated token
                }
                
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            } catch (error) {
                if (i === retries - 1) throw error;  // Throw on last retry
                console.log(`Attempt ${i + 1} failed, retrying...`);
            }
        }
    }

    // Update loadDataFromAPI to use the new makeAPIRequest function
    async function loadDataFromAPI() {
        try {
            console.log('Starting to load data from API');
            
            // Check if we should skip the preloader (after export)
            const skipPreloader = sessionStorage.getItem('skipPreloader');
            if (skipPreloader) {
                console.log('Skipping preloader');
                sessionStorage.removeItem('skipPreloader');
                $('#loadingScreen').hide();
                $('#main').show();
            }
            
            // Record start time for minimum loading duration
            const loadingStartTime = Date.now();
            const minimumLoadingDuration = skipPreloader ? 0 : 3000;
            
            if (!skipPreloader) {
                showLoadingScreen();
            }

            // Get chart ID
            const chartId = getChartIdFromBody();
            console.log('Chart ID:', chartId);
            
            // Make API request with retries
            const jsonData = await makeAPIRequest({ chart_id: chartId });
            console.log('API Response data:', jsonData);
            
            // Process response
            if (jsonData.access === false || jsonData.access === 'false') {
                const errorMessage = jsonData.message || 'Access denied. You do not have permission to view this organization chart.';
                console.log('Access denied:', errorMessage);
                
                if (!skipPreloader) {
                    const elapsedTime = Date.now() - loadingStartTime;
                    const remainingTime = Math.max(0, minimumLoadingDuration - elapsedTime);
                    setTimeout(() => showAccessDeniedScreen(errorMessage), remainingTime);
                } else {
                    showAccessDeniedScreen(errorMessage);
                }
                return false;
            }
            
            if (jsonData.access === true || jsonData.access === 'true') {
                console.log('Access granted, processing data');
                // Map the API response to orgData.nodes
                if (jsonData.nodes_json) {
                    orgData.nodes = jsonData.nodes_json;
                } else if (jsonData.nodes_data) {
                    orgData.nodes = jsonData.nodes_data;
                } else if (jsonData.nodes) {
                    orgData.nodes = jsonData.nodes;
                } else if (Array.isArray(jsonData)) {
                    orgData.nodes = jsonData;
                } else {
                    throw new Error('Invalid API response structure - nodes data not found');
                }
                
                console.log('Data processed, nodes count:', orgData.nodes.length);
                
                if (!skipPreloader) {
                    const elapsedTime = Date.now() - loadingStartTime;
                    const remainingTime = Math.max(0, minimumLoadingDuration - elapsedTime);
                    setTimeout(() => hideLoadingScreen(), remainingTime);
                }
                
                return true;
            }
            
            // Invalid access field
            console.log('Invalid access field in response');
            const message = 'Access verification failed. Please contact your administrator.';
            if (!skipPreloader) {
                const elapsedTime = Date.now() - loadingStartTime;
                const remainingTime = Math.max(0, minimumLoadingDuration - elapsedTime);
                setTimeout(() => showAccessDeniedScreen(message), remainingTime);
            } else {
                showAccessDeniedScreen(message);
            }
            return false;
            
        } catch (error) {
            console.error('Error loading data from API:', error);
            
            if (!skipPreloader) {
                const elapsedTime = Date.now() - loadingStartTime;
                const remainingTime = Math.max(0, minimumLoadingDuration - elapsedTime);
                setTimeout(() => {
                    hideLoadingScreen();
                    showErrorScreen('Failed to connect to the server. Please check your internet connection and try again.', error.message);
                }, remainingTime);
            } else {
                showErrorScreen('Failed to connect to the server. Please check your internet connection and try again.', error.message);
            }
            return false;
        }
    }
    
    

    function showLoadingScreen() {
    const loader = $('#loadingScreen');
    loader.show(); // Make it visible

    // Reset progress bar
    loader.find('.progress-fill').css('width', '0%');

    // Reset text
    const statusMessages = [
        'Establishing connection...',
        'Authenticating access...',
        'Fetching organizational data...',
        'Loading employee information...',
        'Processing hierarchy structure...',
        'Preparing chart visualization...'
    ];

    let messageIndex = 0;
    const statusElement = loader.find('#loadingStatus');

    const statusInterval = setInterval(() => {
        if (messageIndex < statusMessages.length) {
            statusElement.text(statusMessages[messageIndex]);
            messageIndex++;
        }
    }, 600);

    // Animate progress bar
    setTimeout(() => loader.find('.progress-fill').css('width', '25%'), 300);
    setTimeout(() => loader.find('.progress-fill').css('width', '50%'), 900);
    setTimeout(() => loader.find('.progress-fill').css('width', '75%'), 1500);
    setTimeout(() => loader.find('.progress-fill').css('width', '90%'), 2100);

    // Store the interval ID for cleanup
    loader.data('statusInterval', statusInterval);
}

    // Function to hide loading screen
    function hideLoadingScreen() {
        const loader = $('#loadingScreen');
        if (loader.length) {
            // Clear the status interval
            const statusInterval = loader.data('statusInterval');
            if (statusInterval) {
                clearInterval(statusInterval);
            }
            
            // Complete the progress bar
            loader.find('.progress-fill').css('width', '100%');
            loader.find('#loadingStatus').text('Chart loaded successfully!');
            
            // Wait a moment to show completion, then fade out
            setTimeout(() => {
                loader.fadeOut(400, function() {
                    $(this).remove();
                    $('#main').fadeIn(400); // Show main content after loader
                });
            }, 600);
        }
    }    // Function to show access denied screen
    function showAccessDeniedScreen(message) {
        // Clean up loading screen properly
        const loader = $('#loadingScreen');
        if (loader.length) {
            const statusInterval = loader.data('statusInterval');
            if (statusInterval) {
                clearInterval(statusInterval);
            }
            loader.remove();
        }
        
        const accessDeniedHtml = `
            <div id="accessDeniedScreen" class="error-overlay">
                <div class="error-container access-denied-container">
                    <div class="error-icon access-denied-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#dc3545" stroke-width="2"/>
                            <path d="M15 9l-6 6m0-6l6 6" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h1 class="error-title access-denied-title">Access Denied</h1>
                    <p class="error-message access-denied-message">${message}</p>
                    <div class="error-actions">
                        <button class="retry-button" onclick="location.reload()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Try Again
                        </button>
                        <button class="contact-button" onclick="window.open('mailto:info@sphurti.net', '_blank')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Contact Support
                        </button>
                    </div>
                    <div class="error-details">
                        <small>If you believe this is an error, please contact your administrator with the following details:</small>
                        <div class="error-code">Error Code: ACCESS_DENIED_001</div>
                        <div class="error-timestamp">Time: ${new Date().toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
        $('body').append(accessDeniedHtml);
    }    // Function to show general error screen
    function showErrorScreen(message, details = '') {
        // Clean up loading screen properly
        const loader = $('#loadingScreen');
        if (loader.length) {
            const statusInterval = loader.data('statusInterval');
            if (statusInterval) {
                clearInterval(statusInterval);
            }
            loader.remove();
        }
        
        const errorHtml = `
            <div id="errorScreen" class="error-overlay">
                <div class="error-container general-error-container">
                    <div class="error-icon general-error-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#ffc107" stroke-width="2"/>
                            <line x1="12" y1="8" x2="12" y2="12" stroke="#ffc107" stroke-width="2" stroke-linecap="round"/>
                            <line x1="12" y1="16" x2="12.01" y2="16" stroke="#ffc107" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h1 class="error-title general-error-title">Connection Error</h1>
                    <p class="error-message general-error-message">${message}</p>
                    ${details ? `<div class="error-details-expanded"><strong>Details:</strong> ${details}</div>` : ''}
                    <div class="error-actions">
                        <button class="retry-button primary" onclick="location.reload()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Retry Connection
                        </button>
                    </div>
                    <div class="error-details">
                        <small>If the problem persists, please check your internet connection or contact support.</small>
                        <div class="error-code">Error Code: CONNECTION_ERROR_002</div>
                        <div class="error-timestamp">Time: ${new Date().toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
        $('body').append(errorHtml);
    }// Function to refresh data from API
    async function refreshData() {
        const dataLoaded = await loadDataFromAPI();
        
        // Wait for loading screen to complete before initializing
        setTimeout(() => {
            if (dataLoaded) {
                // Clear image cache on refresh to get latest images
                clearImageCache();
                // Reinitialize the chart with new data
                init();
            }
        }, 100); // Small delay to ensure loading screen has finished
    }

    // Initialize the application after loading data
    async function initializeApp() {
        // Load data from API
        const dataLoaded = await loadDataFromAPI();
        
        // Wait for loading screen to complete before initializing
        setTimeout(() => {
            if (dataLoaded) {
                // Initialize the chart
                init();
            }
        }, 100); // Small delay to ensure loading screen has finished
    }

    // Start the application
    initializeApp();

    // Global filter state
    let filterState = {
        activeFilters: {},
        highlightedNodes: new Set()
    };

    // Filter configuration with field mappings and icons
    const filterConfig = {        'designation': {
            label: 'Job Title',
            icon: 'fas fa-user-tie',
            field: 'designation'
        },
        'department': {
            label: 'Department',
            icon: 'fas fa-building',
            field: 'department'
        },
        'seniority_level': {
            label: 'Seniority Level',
            icon: 'fas fa-layer-group',
            field: 'seniority_level'
        },
        'job_function': {
            label: 'Job Function',
            icon: 'fas fa-briefcase',
            field: 'job_function'
        },
        'country': {
            label: 'Country/Region',
            icon: 'fas fa-globe-americas',
            field: 'country'
        },
        'state': {
            label: 'State/Province',
            icon: 'fas fa-map-marker-alt',
            field: 'state'
        },
        'city': {
            label: 'City/Town',
            icon: 'fas fa-city',
            field: 'city'
        },
        'matchpoint': {
            label: 'Matchpoint',
            icon: 'fas fa-crosshairs',
            field: 'matchpoint'
        },
        'node_type': {
            label: 'Node Type',
            icon: 'fas fa-sitemap',
            field: 'node_type'
        }
    };

    // Function to extract unique values for each filterable field
    function extractFilterOptions(nodes) {
        const filterOptions = {};
        
        Object.keys(filterConfig).forEach(filterKey => {
            const field = filterConfig[filterKey].field;
            filterOptions[filterKey] = new Set();
        });

        nodes.forEach(node => {
            Object.keys(filterConfig).forEach(filterKey => {
                const field = filterConfig[filterKey].field;
                const value = node[field];
                if (value && value.toString().trim() !== '') {
                    filterOptions[filterKey].add(value.toString().trim());
                }
            });
        });

        // Convert Sets to sorted arrays with counts
        Object.keys(filterOptions).forEach(filterKey => {
            const field = filterConfig[filterKey].field;
            const valuesArray = Array.from(filterOptions[filterKey]).sort();
            filterOptions[filterKey] = valuesArray.map(value => ({
                value: value,
                count: nodes.filter(node => node[field] && node[field].toString().trim() === value).length
            }));
        });

        return filterOptions;
    }

    // Function to create filter groups in the sidebar
    function createFilterGroups(filterOptions) {
        const container = $('#filterGroupsContainer');
        container.empty();

        Object.keys(filterConfig).forEach(filterKey => {
            const config = filterConfig[filterKey];
            const options = filterOptions[filterKey];

            if (options && options.length > 0) {
                const groupHtml = `
                    <div class="filter-group-item" data-filter="${filterKey}">
                        <div class="filter-group-header">
                            <div class="filter-group-title">
                                <i class="${config.icon}"></i>
                                <span>${config.label}</span>
                            </div>
                            <i class="fas fa-chevron-down filter-group-toggle"></i>
                        </div>
                        <div class="active-filters-bar" id="activeFiltersBar" aria-label="Active Filters" tabindex="0"  style="display: none;"></div>
                        <div class="filter-group-content">
                            <input type="text" class="filter-search" placeholder="Search ${config.label.toLowerCase()}...">
                            <div class="filter-options">
                                <div class="filter-option select-all-option">
                                    <input type="checkbox" class="select-all-checkbox" data-filter="${filterKey}">
                                    <span class="filter-option-label">Select All</span>
                                    <span class="filter-option-count">${options.length}</span>
                                </div>
                                ${options.map(option => `
                                    <div class="filter-option" data-value="${option.value}">
                                        <input type="checkbox" class="filter-checkbox" data-filter="${filterKey}" data-value="${option.value}">
                                        <span class="filter-option-label">${option.value}</span>
                                        <span class="filter-option-count">${option.count}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
                container.append(groupHtml);
            }
        });

        // Initialize filter interactions
        initializeFilterInteractions();
    }

    // Function to initialize filter interactions
    function initializeFilterInteractions() {
        // Toggle filter groups
        $('.filter-group-header').off('click').on('click', function(e) {
            e.preventDefault();
            const content = $(this).siblings('.filter-group-content');
            const toggle = $(this).find('.filter-group-toggle');
            
            if (content.hasClass('expanded')) {
                content.removeClass('expanded').slideUp(300);
                toggle.removeClass('collapsed');
            } else {
                content.addClass('expanded').slideDown(300);
                toggle.addClass('collapsed');
            }
        });

        // Filter search functionality
        $('.filter-search').off('input').on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            const filterOptions = $(this).siblings('.filter-options').find('.filter-option:not(.select-all-option)');
            
            filterOptions.each(function() {
                const label = $(this).find('.filter-option-label').text().toLowerCase();
                if (label.includes(searchTerm)) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });        // Select all functionality
        $('.select-all-checkbox').off('change').on('change', function() {
            const filterKey = $(this).data('filter');
            const isChecked = $(this).is(':checked');
            const filterOptions = $(this).closest('.filter-options');
            const visibleCheckboxes = filterOptions.find('.filter-checkbox:visible');
            
            visibleCheckboxes.prop('checked', isChecked);
            
            // Update filter state
            if (isChecked) {
                if (!filterState.activeFilters[filterKey]) {
                    filterState.activeFilters[filterKey] = new Set();
                }
                visibleCheckboxes.each(function() {
                    const value = $(this).data('value');
                    filterState.activeFilters[filterKey].add(value);
                });
            } else {
                if (filterState.activeFilters[filterKey]) {
                    visibleCheckboxes.each(function() {
                        const value = $(this).data('value');
                        filterState.activeFilters[filterKey].delete(value);
                    });
                    if (filterState.activeFilters[filterKey].size === 0) {
                        delete filterState.activeFilters[filterKey];
                    }
                }            }
            
            // Debounce the filter application to prevent connector breaking with longer delay
            clearTimeout(window.filterTimeout);
            window.filterTimeout = setTimeout(() => {
                applyFilters();
            }, 200);
        });// Individual checkbox functionality
        $('.filter-checkbox').off('change').on('change', function() {
            const filterKey = $(this).data('filter');
            const value = $(this).data('value');
            const isChecked = $(this).is(':checked');
            
            if (!filterState.activeFilters[filterKey]) {
                filterState.activeFilters[filterKey] = new Set();
            }
            
            if (isChecked) {
                filterState.activeFilters[filterKey].add(value);
            } else {
                filterState.activeFilters[filterKey].delete(value);
                if (filterState.activeFilters[filterKey].size === 0) {
                    delete filterState.activeFilters[filterKey];
                }
            }
            
            // Update select all checkbox state
            const selectAllCheckbox = $(this).closest('.filter-options').find('.select-all-checkbox');
            const allCheckboxes = $(this).closest('.filter-options').find('.filter-checkbox:visible');
            const checkedCheckboxes = allCheckboxes.filter(':checked');
              selectAllCheckbox.prop('checked', checkedCheckboxes.length === allCheckboxes.length);
              // Debounce the filter application to prevent connector breaking with longer delay
            clearTimeout(window.filterTimeout);
            window.filterTimeout = setTimeout(() => {
                applyFilters();
            }, 200);
        });        // Clear all filters
        $('#clearAllFilters').off('click').on('click', function() {
            filterState.activeFilters = {};
            filterState.highlightedNodes.clear();
            $('.filter-checkbox, .select-all-checkbox').prop('checked', false);
            // Clear the active filters bar
            updateActiveFiltersBar();

            // Debounce the filter application to prevent connector breaking with longer delay
            clearTimeout(window.filterTimeout);
            window.filterTimeout = setTimeout(() => {
                applyFilters();
            }, 200);
        });
    }    // Function to apply filters (show matching nodes highlighted, others as white dots)
    function applyFilters() {
       expandAll();
        // If no filters are active, show all nodes normally and recalculate connectors
        if (Object.keys(filterState.activeFilters).length === 0) {
            // Clear all filter-related classes and restore all nodes
            $('.org-card, .person-card, .dept-card').each(function() {
                const $element = $(this);
                
                // Remove all filter-related classes
                $element.removeClass('highlighted filtered-out filtered-dot filter-reveal filter-reveal-hierarchy converting-to-dot dot-revealed dot-fading node-restored');
                
                // If this was a white dot, restore it properly
                if ($element.hasClass('filtered-dot') || $element.find('.filter-white-dot').length > 0) {
                    restoreNodeFromWhiteDot($element);
                }
                
                // Ensure the element is visible
                $element.show();
            });
              // Remove any white dots that might still exist
            $('.filter-white-dot').remove();
            filterState.highlightedNodes.clear();
            
            // Clear the original node state to free up memory
            for (const nodeId in originalNodeState) {
                delete originalNodeState[nodeId];
            }
            
            // Clear the original node state to free up memory
            for (const nodeId in originalNodeState) {
                delete originalNodeState[nodeId];
            }
            
            // Recalculate connectors when filters are cleared with multiple attempts
            setTimeout(() => {
                performConnectorRecalculation();
            }, 100);
            setTimeout(() => {
                performConnectorRecalculation();
            }, 300);
            setTimeout(() => {
                performConnectorRecalculation();
            }, 600);
            
            // Check for empty nodes and regenerate chart if needed
            setTimeout(() => {
                let foundEmptyNodes = false;
                $('.org-card, .person-card, .dept-card').each(function() {
                    const $element = $(this);
                    const content = $element.html().trim();
                    if (content === '' || (content.includes('filter-white-dot') && !$element.data('original-content'))) {
                        foundEmptyNodes = true;
                    }
                });
                
                if (foundEmptyNodes) {
                    const chartHTML = generateChartHTML();
                    $('.org-chart').html(chartHTML);
                    setupSiblingConnectors();
                    performConnectorRecalculation();
                }
            }, 500);
              // Only auto-zoom if not called from search navigation
            zoomToFitAll();
          
        
            return;
        }

        // Remove all highlights and reset node states (but don't show all nodes yet)
        $('.org-card, .person-card, .dept-card').removeClass('highlighted filtered-out filtered-dot filter-reveal filter-reveal-hierarchy converting-to-dot dot-revealed dot-fading node-restored');
        $('.filter-white-dot').remove();
        filterState.highlightedNodes.clear();

        // Restore all nodes from white dots first
        $('.org-card, .person-card, .dept-card').each(function() {
            restoreNodeFromWhiteDot($(this));
        });

        // Find matching nodes
        const matchedNodeIds = new Set();
        const rootNodeIds = new Set();
        
        // First, identify root nodes
        orgData.nodes.forEach(node => {
            if (node.node_type === 'Organization' || node.pid === undefined || node.pid === null) {
                rootNodeIds.add(node.id);
            }
        });
          // Then find matching nodes (excluding root nodes from filter criteria)
        orgData.nodes.forEach(node => {
            // Root nodes are always visible, don't apply filters to them
            if (rootNodeIds.has(node.id)) {
                return;
            }
            
            let matches = true;
            Object.keys(filterState.activeFilters).forEach(filterKey => {
                const field = filterConfig[filterKey].field;
                const filterValues = filterState.activeFilters[filterKey];
                const nodeValue = node[field] ? node[field].toString().trim() : '';
                if (!filterValues.has(nodeValue)) {
                    matches = false;
                }
            });
            if (matches) {
                matchedNodeIds.add(node.id);
            }
        });
        
        const nodeMap = {};
        orgData.nodes.forEach(node => { nodeMap[node.id] = node; });

        // Determine which nodes to show: matched nodes + their immediate departments + root nodes
        const hierarchyNodeIds = new Set([...matchedNodeIds, ...rootNodeIds]);
          // Add department hierarchy path from matched persons to root - only department nodes
        matchedNodeIds.forEach(id => {
            const node = nodeMap[id];
            if (node && node.pid !== undefined && node.pid !== null) {
                // Traverse up the hierarchy to root, adding only department nodes
                let currentNode = nodeMap[node.pid];
                
                while (currentNode && !rootNodeIds.has(currentNode.id)) {
                    // Only add if it's a department node (not a person)
                    if (currentNode.node_type === 'Department' || currentNode.node_type === 'Organization') {
                        hierarchyNodeIds.add(currentNode.id);
                    }
                    
                    // Move to parent
                    if (currentNode.pid !== undefined && currentNode.pid !== null) {
                        currentNode = nodeMap[currentNode.pid];
                    } else {
                        break;
                    }
                }
            }
        });// Apply visual changes to nodes with reveal animation
        // Root nodes are already identified above, so we can use them directly
        
        
        orgData.nodes.forEach((node, index) => {
            const selector = `.org-card[data-id="${node.id}"], .person-card[data-id="${node.id}"]`;
            const $nodeElement = $(selector);
            
            // Always show root nodes (Organization) without filtering
            if (rootNodeIds.has(node.id)) {
                $nodeElement.removeClass('highlighted filtered-dot').show();
                // Ensure root node is always expanded
                setTimeout(() => {
                    expandNode(node.id, true);
                }, 50);
            } else if (matchedNodeIds.has(node.id)) {
                // Highlight matched nodes with reveal animation
                $nodeElement.addClass('highlighted').show();
                addRevealAnimation($nodeElement, index);
            } else if (hierarchyNodeIds.has(node.id)) {
                // Show hierarchy nodes (including departments) normally with subtle reveal
                $nodeElement.removeClass('highlighted').show();
                addRevealAnimation($nodeElement, index, true);
            } else {
                // Convert other nodes to white dots - these should be hidden/converted
                convertNodeToWhiteDot($nodeElement, node);
            }
        });        // Recalculate connectors multiple times to ensure proper layout
        // First immediate recalculation
        performConnectorRecalculation();
        
        // Second recalculation after a short delay for animations
        setTimeout(() => {
            performConnectorRecalculation();
        }, 150);
        
        // Third recalculation after all animations should be complete
        setTimeout(() => {
            performConnectorRecalculation();
        }, 400);
          // Final stabilization recalculation for unchecking scenarios
        setTimeout(() => {
            performConnectorRecalculation();
        }, 700);
        
        // Center and fit chart specifically for filtering
        setTimeout(() => {
            centerChartOnFiltering();
        }, 800);

    }// Function to convert a node to a white dot
    
    
    function updateActiveFiltersBar() {
        // For each filter group, update its active filters bar
        Object.keys(filterConfig).forEach(filterKey => {
            const $group = $(`.filter-group-item[data-filter="${filterKey}"]`);
            const $bar = $group.find('.active-filters-bar');
            $bar.empty();

            if (filterState.activeFilters[filterKey] && filterState.activeFilters[filterKey].size > 0) {
                filterState.activeFilters[filterKey].forEach(value => {
                    const filterChip = $(`
                        <span class="active-filter-chip" data-filter="${filterKey}" data-value="${value}" tabindex="0" aria-label="Remove filter ${value}">
                            ${value}
                            <button class="remove-filter-btn" title="Remove filter" tabindex="0" aria-label="Remove filter ${value}">&times;</button>
                        </span>
                    `);
                    $bar.append(filterChip);
                });
                $bar.show();
            } else {
                $bar.hide();
            }
        });
    }

    // Listen for checkbox changes to update active filters bar
    $(document).on('change', '.filter-checkbox, .select-all-checkbox', function() {
        updateActiveFiltersBar();
    });
   

    // Listen for remove button click to uncheck and remove filter
    $(document).on('click', '.remove-filter-btn', function(e) {
        e.stopPropagation();
        const $chip = $(this).closest('.active-filter-chip');
        const filterKey = $chip.data('filter');
        const value = $chip.data('value');
        // Uncheck the corresponding checkbox
        $(`.filter-checkbox[data-filter="${filterKey}"][data-value="${value}"]`).prop('checked', false).trigger('change');
        // Remove from filter state
        if (filterState.activeFilters[filterKey]) {
            filterState.activeFilters[filterKey].delete(value);
            if (filterState.activeFilters[filterKey].size === 0) {
                delete filterState.activeFilters[filterKey];
            }
        }
        updateActiveFiltersBar();
        // Apply filters after removal
        clearTimeout(window.filterTimeout);
        window.filterTimeout = setTimeout(() => {
            applyFilters();
        }, 200);
    });

    // Initialize active filters bar on page load
    $(document).ready(function() {
        updateActiveFiltersBar();
    });














const originalNodeState = {}; // Global map to store original nodes

function convertNodeToWhiteDot($nodeElement, nodeData) {
    if ($nodeElement.length === 0) return;

    const nodeId = nodeData.id;

    // Only store once, but store enhanced state including image loading status
    if (!originalNodeState[nodeId]) {
        // Before storing, capture current image states
        const $images = $nodeElement.find('.lazy-image, img');
        const imageStates = [];
        
        $images.each(function() {
            const img = this;
            imageStates.push({
                element: img.outerHTML,
                src: img.src,
                dataSrc: img.dataset.src,
                classes: img.className,
                loaded: img.classList.contains('loaded'),
                loading: img.classList.contains('loading'),
                error: img.classList.contains('error')
            });
        });

        originalNodeState[nodeId] = {
            content: $nodeElement.html(),
            classes: $nodeElement.attr('class'),
            imageStates: imageStates
        };
    }

    $nodeElement.addClass('converting-to-dot');
    setTimeout(() => {
        $nodeElement.addClass('filtered-dot');
        $nodeElement.html(`
            <div class="filter-white-dot" data-node-id="${nodeId}" title="${getNodeTitle(nodeData)}">
                <div class="white-dot"></div>
            </div>
        `);
        $nodeElement.removeClass('converting-to-dot').addClass('dot-revealed');

        setTimeout(() => {
            $nodeElement.removeClass('dot-revealed');
        }, 300);
    }, 200);
}


function restoreNodeFromWhiteDot($nodeElement) {
    if ($nodeElement.length === 0) return;

    const nodeId = $nodeElement.find('.filter-white-dot').data('node-id') || $nodeElement.data('id');
    const saved = originalNodeState[nodeId];

  

    if (saved) {
        $nodeElement.addClass('dot-fading');

        setTimeout(() => {
            $nodeElement.html(saved.content);
            $nodeElement.attr('class', saved.classes);
            $nodeElement.removeClass('dot-fading').addClass('node-restored');

            // Restore images with their previous loading states
            if (saved.imageStates && saved.imageStates.length > 0) {
                const $restoredImages = $nodeElement.find('.lazy-image, img');
                
                $restoredImages.each(function(index) {
                    const img = this;
                    const savedState = saved.imageStates[index];
                    
                    if (savedState) {
                        // Restore the image state
                        if (savedState.loaded) {
                            // Image was previously loaded, restore the loaded state
                            img.src = savedState.src;
                            img.className = savedState.classes;
                            img.classList.add('loaded');
                            img.classList.remove('loading', 'error');
                        } else if (savedState.loading) {
                            // Image was loading, restart the loading process
                            img.classList.remove('loaded', 'error');
                            img.classList.add('loading');
                            if (imageObserver) {
                                imageObserver.observe(img);
                            } else {
                                loadImageLazily(img);
                            }
                        } else if (savedState.error) {
                            // Image had an error, maintain error state
                            img.className = savedState.classes;
                        } else {
                            // Image was not loaded yet, re-initialize lazy loading
                            img.classList.remove('loaded', 'loading', 'error');
                            if (imageObserver) {
                                imageObserver.observe(img);
                            } else {
                                loadImageLazily(img);
                            }
                        }
                    }
                });
            } else {
                // Fallback: Re-initialize lazy loading for all images
                const $restoredImages = $nodeElement.find('.lazy-image');
                if ($restoredImages.length > 0) {
                    $restoredImages.each(function() {
                        const img = this;
                        // Reset image state
                        img.classList.remove('loaded', 'loading', 'error');
                        
                        // If image observer is available, observe the image
                        if (imageObserver) {
                            imageObserver.observe(img);
                        } else {
                            // Fallback: load image directly
                            loadImageLazily(img);
                        }
                    });
                    
                    // Also trigger immediate loading for visible images
                    setTimeout(() => {
                        $restoredImages.each(function() {
                            const img = this;
                            const rect = img.getBoundingClientRect();
                            if (rect.top < window.innerHeight && rect.bottom > 0) {
                                loadImageLazily(img);
                            }
                        });
                    }, 50);
                }
            }

            setTimeout(() => {
                $nodeElement.removeClass('node-restored');
            }, 200);
        }, 50);
    } else {
        $nodeElement.removeClass('filtered-dot converting-to-dot dot-revealed dot-fading node-restored');
        $nodeElement.find('.filter-white-dot').remove();
    }
   
}

      // Function to add reveal animation to filtered nodes
    function addRevealAnimation($element, index, isHierarchy = false) {
        if ($element.length === 0) return;
        
        // Remove any existing animation classes
        $element.removeClass('filter-reveal filter-reveal-hierarchy');
        
        // Add appropriate animation class
        const animationClass = isHierarchy ? 'filter-reveal-hierarchy' : 'filter-reveal';
        
        // Add animation with staggered delay
        setTimeout(() => {
            $element.addClass(animationClass);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                $element.removeClass(animationClass);
            }, 600);
        }, index * 50); // Stagger by 50ms per node
    }    // Function to get node title for tooltip
    function getNodeTitle(nodeData) {
        if (nodeData.node_type === 'Person') {
            return `${nodeData.name || 'Unknown'} - ${nodeData.designation || ''}`;
        }else if (nodeData.node_type === 'Department') {
            return `Department: ${nodeData.department || nodeData.dept_name || 'Unknown'}`;
        } else if (nodeData.node_type === 'Organization') {
            return `Organization: ${nodeData.org_name || 'Unknown'}`;
        }
        return 'Unknown Node';
    }

    // Function to initialize filters after data is loaded
    function initializeFilters() {
        if (orgData.nodes && orgData.nodes.length > 0) {
            const filterOptions = extractFilterOptions(orgData.nodes);
            createFilterGroups(filterOptions);
        }
    }

  
// Function to build hierarchical structure and generate chart
           
  
// Function to build hierarchical structure and generate chart
    function buildHierarchy(nodes) {
        const hierarchy = {};
        const rootNodes = [];
        
        // First pass: Create node objects with empty children arrays
        nodes.forEach(node => {
            hierarchy[node.id] = { ...node, children: [] };
        });
        
        // Second pass: Build parent-child relationships
        nodes.forEach(node => {
            if (node.pid != undefined && hierarchy[node.pid]) {
                hierarchy[node.pid].children.push(node.id);
            } else {
                // Root node (no parent)
                rootNodes.push(node.id);
            }
        });
        
        return { hierarchy, rootNodes };
    }    function generateChartHTML() {
        const { hierarchy, rootNodes } = buildHierarchy(orgData.nodes);        function generateLevel(nodeIds, level) {
            if (!nodeIds || nodeIds.length === 0) return '';
            
            const hasMultipleNodes = nodeIds.length > 1;
            let html = `<div class="org-level level-${level}">`;
              // Container for all nodes at this level
            html += '<div class="level-nodes">';
            
            // Add horizontal connector for siblings (except root level) - moved inside level-nodes
            if (hasMultipleNodes && level > 1) {
                html += '<div class="sibling-connector"></div>';
            }
            
            nodeIds.forEach((nodeId, index) => {
                const node = hierarchy[nodeId];
                if (!node) return;
                
                const hasChildren = node.children && node.children.length > 0;
                // Check if this node has siblings (multiple nodes at the same level)
                const hasSiblings = hasMultipleNodes;
                
                html += '<div class="node-container">';

                // Add vertical connector from parent (except for root level)
                if (level > 1) {
                    html += '<div class="parent-connector"></div>';
                }
                
                // Add the node with sibling class if it has siblings
                html += generateSingleNode(node, level, hasChildren, hasSiblings);
                
                // Add children if they exist
                if (hasChildren) {
                    html += '<div class="child-connector"></div>';
                    html += `<div class="children-group level-${level + 1}-group" data-parent="${nodeId}">`;
                    html += generateLevel(node.children, level + 1);
                    html += '</div>';
                }
                
                html += '</div>';
            });
               html += '</div>';
            
            html += '</div>';
            
            return html;
        }        function generateSingleNode(node, level, hasChildren, hasSiblings = false) {
            if (!node) return '';
            
            // Add the node-with-siblings class if this node has siblings
            const siblingClass = hasSiblings ? ' node-with-siblings' : '';
            
            const expandCollapseBtn = hasChildren ? `
                <div class="expand-collapse-btn">
                    <div class="collapse-btn" data-parent="${node.id}"></div>
                    <div class="expand-btn" data-parent="${node.id}" style="display: none;"></div>
                </div>` : '';
              if (node.node_type === 'Organization') {                return `
                    <div class="org-card${siblingClass}" data-id="${node.id}" data-type="organization">
                        <div class="card-header">
                            <span class="company-name">${node.org_name}</span>
                             ${createLazyImage(node.img, 'tech-logo', 'Organization logo')}
                        </div>
                        <div class="card-body">
                            <div class="card-title">Organization</div>
                        </div>
                        ${expandCollapseBtn}
                    </div>`;
            } else if (node.node_type === 'Department') {                return `
                    <div class="org-card dept-card${siblingClass}" data-id="${node.id}" data-type="department">
                        <div class="card-header">
                            <span class="company-name">${node.department}</span>
                            ${createLazyImage(node.img, 'tech-logo', 'Department logo')}
                        </div>
                        <div class="card-body">
                            <div class="card-title">Department</div>
                        </div>
                        ${expandCollapseBtn}
                    </div>`;            } else if (node.node_type === 'Person') {
                const avatarContent = node.img ? 
                    createLazyImage(node.img, 'profile-avatar-image', node.name + ' avatar') : 
                    `<span class="avatar-text">${node.name ? node.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'UN'}</span>`;
                
                return `
                    <div class="person-card${siblingClass}" data-id="${node.id}">
                        <div class="person-avatar">
                            ${avatarContent}
                        </div>
                        <div class="person-info">
                            <div class="person-name">${node.name}</div>
                            <div class="person-title">${node.designation}</div>
                        </div>
                        ${expandCollapseBtn}
                    </div>`;
            }
            return '';
        }

        return generateLevel(rootNodes, 1);
    }
               

    let sidebarVisible = false;
    let rightPanelVisible = false;
    let currentSelection = 0; // Default selection

    // Chart elements - declare once for both dragging and zooming
    const orgChart = $('.org-chart');
    let organization_name = '';
    let chartContainer = $('.chart-container');    // Initialize the interface
      function init() {
        // Initialize lazy loading first
        initializeLazyLoading();
        
        // Generate the chart dynamically
        const chartHTML = generateChartHTML();
        $('.org-chart').html(chartHTML);
        
        // Setup sibling connectors after DOM is ready
        setupSiblingConnectors();
        // Initialize lazy loading for generated images
        setTimeout(() => {
            observeLazyImages();
            preloadCriticalImages();
        }, 100);
          
        collapseAll();
        // Update app title with organization name
        const orgNode = orgData.nodes.find(node => node.node_type === 'Organization');
        if (orgNode && orgNode.org_name) {
            organization_name =  orgNode.org_name
            $('.app-title').text(orgNode.org_name);
        }

        
        const personCount = orgData.nodes.filter(node => node.node_type === 'Person').length;
        $('.total-count span').text(`Total: ${personCount} People`);        
        updateRightPanel('Organization', currentSelection);
        bindEvents();
        
        // Initialize connector monitoring for dynamic updates
        // initializeConnectorMonitoring();
          // Initialize sidebar and right panel as hidden with toggle buttons visible
        sidebarVisible = false;
        rightPanelVisible = false;
        $('#sidebar').addClass('hidden');
        
        // Initialize filters after chart is generated
        initializeFilters();
        $('#rightPanel').addClass('hidden');
        $('#sidebarToggle').addClass('visible');
        $('#applyFilters').removeClass('active').text('▶ Menu');        // Add window resize handler to recalculate connectors
        $(window).on('resize', function() {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(function() {
                performConnectorRecalculation();
            }, 150);
        });
        
        // Collapse all nodes after chart is fully initialized and visible
        // Check if loading screen is present, if so wait for it to complete
        if ($('#loadingScreen').length > 0) {
            // Loading screen is present, wait for it to complete
            const checkAndCollapse = () => {
                if ($('#loadingScreen').length === 0 && $('#main').is(':visible')) {
                    // Loading screen is gone and main content is visible
                    setTimeout(() => {
                        collapseAll();
                    }, 200);
                } else {
                    // Keep checking every 100ms
                    setTimeout(checkAndCollapse, 100);
                }
            };
            setTimeout(checkAndCollapse, 500); // Start checking after 500ms
        } else {
            // No loading screen, collapse immediately
            setTimeout(() => {
                collapseAll();
            }, 200);
        }
        
    }function setupSiblingConnectors() {
        // Wait for DOM to be fully rendered
        setTimeout(() => {
            setupConnectors();
        }, 100);
    }

    function setupConnectors() {        // Setup horizontal sibling connectors
        $('.level-nodes').each(function() {
            const $levelNodes = $(this);
            const $nodeContainers = $levelNodes.find('> .node-container');
            
            if ($nodeContainers.length > 1) {
                const $siblingConnector = $levelNodes.find('> .sibling-connector');
                
                if ($siblingConnector.length > 0) {
                    // Calculate positions after layout is complete
                    const nodePositions = [];
                    $nodeContainers.each(function() {
                        const $node = $(this);
                        const nodeOffset = $node.offset();
                        const nodeWidth = $node.outerWidth();
                        nodePositions.push({
                            left: nodeOffset.left,
                            center: nodeOffset.left + (nodeWidth / 2),
                            width: nodeWidth
                        });
                    });
                    
                    if (nodePositions.length > 1) {
                        const firstCenter = nodePositions[0].center;
                        const lastCenter = nodePositions[nodePositions.length - 1].center;
                        const connectorWidth = Math.abs(lastCenter - firstCenter);
                        
                        // Position relative to the level container
                        const levelOffset = $levelNodes.offset();
                        const relativeLeft = Math.min(firstCenter, lastCenter) - levelOffset.left;
                        
                        $siblingConnector.css({
                            'left': relativeLeft + 'px',
                            'width': connectorWidth + 'px',
                            'display': 'block'
                        });
                    }
                }
            }
        });

        // Setup vertical connectors with proper positioning
        setupVerticalConnectors();
        
        // Setup drop-down connectors from horizontal lines to child nodes
        setupDropConnectors();
    }

    function setupVerticalConnectors() {
        $('.parent-connector').each(function() {
            const $connector = $(this);
            const $nodeContainer = $connector.closest('.node-container');
            const $parentLevel = $nodeContainer.closest('.org-level').prev('.org-level');
            
            if ($parentLevel.length > 0) {
                // Make connector visible and properly positioned
                $connector.css({
                    'margin': '0 auto',
                    'display': 'block'
                });
            }
        });

        $('.child-connector').each(function() {
            const $connector = $(this);
            const $nodeContainer = $connector.closest('.node-container');
            const $childrenGroup = $nodeContainer.find('.children-group');
            
            if ($childrenGroup.length > 0 && $childrenGroup.children().length > 0) {
                $connector.css({
                    'margin': '0 auto',
                    'display': 'block'
                });
            } else {
                $connector.hide();
            }
        });
    }    function setupDropConnectors() {
        // Add drop connectors from horizontal sibling lines to individual nodes
        $('.sibling-connector').each(function() {
            const $siblingConnector = $(this);
            const $levelNodes = $siblingConnector.parent('.level-nodes');
            const $nodeContainers = $levelNodes.find('> .node-container');
            
            // Remove existing drop connectors
            $siblingConnector.find('.drop-connector').remove();
            
            if ($nodeContainers.length > 1) {
                $nodeContainers.each(function() {
                    const $nodeContainer = $(this);
                    const $node = $nodeContainer.find('.org-card, .person-card').first();
                    
                    if ($node.length > 0) {
                        // Calculate position for drop connector
                        const nodeOffset = $node.offset();
                        const nodeWidth = $node.outerWidth();
                        const nodeCenter = nodeOffset.left + (nodeWidth / 2);
                        const siblingOffset = $siblingConnector.offset();
                        const relativeLeft = nodeCenter - siblingOffset.left;
                        
                        // Create drop connector
                        const $dropConnector = $('<div class="drop-connector"></div>');
                        $dropConnector.css({
                            'position': 'absolute',
                            'left': relativeLeft + 'px',
                            'top': '0px',
                            'width': '2px',
                            'height': '40px',
                            'background': '#aeaeae',
                            'z-index': '2',
                            'transform': 'translateX(-50%)'
                        });
                        
                        $siblingConnector.append($dropConnector);
                    }
                });
            }
        });
    }

    function bindEvents() {
        // Sidebar toggle
        $('#applyFilters').click(function() {
            toggleSidebar();
        });        // Enhanced search functionality with suggestions
        $('.search-input').on('input', function() {
            const searchTerm = $(this).val().toLowerCase().trim();
            const $clearBtn = $('.search-clear');
            const $suggestions = $('#searchSuggestions');
            
            if (searchTerm.length > 0) {
                $clearBtn.css('opacity', '1');
                showSearchSuggestions(searchTerm);
            } else {
                $clearBtn.css('opacity', '0');
                hideSearchSuggestions();
                clearSearch();
            }
        });        // Hide suggestions when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.search-container').length) {
                hideSearchSuggestions();
                 $('.search-input').blur(); 
            }
        });

        // Prevent hiding suggestions when hovering over them
        $(document).on('mouseenter', '#searchSuggestions', function() {
            $(this).data('hovering', true);
        });

        $(document).on('mouseleave', '#searchSuggestions', function() {
            $(this).data('hovering', false);
        });        // Clear search button
        $('#clearSearch').click(function() {
            $('.search-input').val('').focus();
            $(this).css('opacity', '0');
            hideSearchSuggestions();
            clearSearch();
        });        // Refresh data button click handler
        $('#refreshData').click(function() {
            $(this).prop('disabled', true).text('Refreshing...');
            
            refreshData().then(() => {
                $(this).prop('disabled', false).text('Refresh Data');
            }).catch(() => {
                $(this).prop('disabled', false).text('Refresh Data');
            });
        });

        // Clear image cache button (optional debug feature)
        $('#clearImageCache').click(function() {
            clearImageCache();
            retryFailedImages();
            $(this).text('Cache Cleared!');
            setTimeout(() => {
                $(this).text('Clear Cache');
            }, 2000);
        });

        // Performance monitoring
        if (window.performance && window.performance.observer) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'resource' && entry.name.includes('image')) {
                    }
                });
            });
            observer.observe({entryTypes: ['resource']});
        }

        // Show search suggestions
        function showSearchSuggestions(term) {
            const $suggestions = $('#searchSuggestions');
            const suggestions = getSearchSuggestions(term);
            
            if (suggestions.length > 0) {
                let html = '';
                suggestions.forEach(item => {
                    const iconClass = item.type === 'Person' ? 'person' : 
                                    item.type === 'Department' ? 'department' : 'organization';
                    const iconSymbol = item.type === 'Person' ? '👤' : 
                                     item.type === 'Department' ? '🏢' : '🏛️';
                    
                    html += `
                        <div class="search-suggestion-item" 
                             data-node-id="${item.id}" 
                             data-node-type="${item.type}">
                            <div class="search-suggestion-icon ${iconClass}">
                                ${iconSymbol}
                            </div>
                            <div class="search-suggestion-text">
                                <div class="search-suggestion-name">${item.name}</div>
                                <div class="search-suggestion-meta">${item.meta}</div>
                            </div>
                        </div>
                    `;
                });
                $suggestions.html(html).show();
            } else {
                $suggestions.html('<div class="search-suggestions-empty">No matches found</div>').show();
            }
        }

        // Hide search suggestions
        function hideSearchSuggestions() {
            $('#searchSuggestions').hide().empty();
        }        // Get search suggestions from data        
        function getSearchSuggestions(term) {
            const suggestions = [];
            const maxSuggestions = 8;
            
            // Calculate employee count for departments
            function getEmployeeCountForDepartment(deptName) {
                return orgData.nodes.filter(node => 
                    node.node_type === 'Person' && 
                    (node.department === deptName || node.dept_name === deptName)
                ).length;
            }
            
            // Search through all nodes
            orgData.nodes.forEach(node => {
                if (suggestions.length >= maxSuggestions) return;
                
                let matches = false;
                let name = '';
                let meta = '';
                  if (node.node_type === 'Person') {
                    name = node.name || 'Unknown';
                    meta = (node.designation || '') + (node.department ? ` • ${node.department}` : '');
                    matches = name.toLowerCase().includes(term) || 
                             (node.designation && node.designation.toLowerCase().includes(term)) ||
                             (node.department && node.department.toLowerCase().includes(term));
                } else if (node.node_type === 'Department') {
                    name = node.department || node.dept_name || 'Unknown Department';
                    const employeeCount = getEmployeeCountForDepartment(name);
                    meta = `Department • ${employeeCount} employee${employeeCount !== 1 ? 's' : ''}`;
                    matches = name.toLowerCase().includes(term);
                } else if (node.node_type === 'Organization') {
                    name = node.org_name || 'Unknown Organization';
                    meta = `Organization • ${node.employee_range || ''}`;
                    matches = name.toLowerCase().includes(term);
                }
                
                if (matches) {
                    suggestions.push({
                        id: node.id,
                        type: node.node_type,
                        name: name,
                        meta: meta
                    });
                }
            });
            
            return suggestions;
        }

        // Handle suggestion item hover
        $(document).on('mouseenter', '.search-suggestion-item', function() {
            const nodeId = $(this).data('node-id');
            const nodeType = $(this).data('node-type');
            highlightNode(nodeId, nodeType);
        });

        $(document).on('mouseleave', '.search-suggestion-item', function() {
            clearHighlight();
        });

        // Handle suggestion item click
        $(document).on('click', '.search-suggestion-item', function() {
            const nodeId = $(this).data('node-id');
            const nodeType = $(this).data('node-type');
            navigateToNode(nodeId, nodeType);
            hideSearchSuggestions();
        });        // Highlight node function
        function highlightNode(nodeId, nodeType) {
            clearHighlight();
            
            if (nodeType === 'Person') {
                $(`.person-card[data-id="${nodeId}"]`).addClass('search-highlight');
            } else if (nodeType === 'Department') {
                $(`.org-card[data-id="${nodeId}"][data-type="department"]`).addClass('search-highlight');
            } else if (nodeType === 'Organization') {
                $(`.org-card[data-id="${nodeId}"][data-type="organization"]`).addClass('search-highlight');
            }
        }// Clear highlight function
        function clearHighlight() {
            $('.person-card, .org-card').removeClass('search-highlight');
        }

        // Clear search function
        function clearSearch() {
            clearHighlight();
            $('.person-card, .org-card').removeClass('search-highlight');
        }        // Navigate to node function
        function navigateToNode(nodeId, nodeType) {
            let $targetCard;
            
            if (nodeType === 'Person') {
                $targetCard = $(`.person-card[data-id="${nodeId}"]`);
            } else if (nodeType === 'Department') {
                $targetCard = $(`.org-card[data-id="${nodeId}"][data-type="department"]`);
            } else if (nodeType === 'Organization') {
                $targetCard = $(`.org-card[data-id="${nodeId}"][data-type="organization"]`);
            }
              if ($targetCard && $targetCard.length > 0) {
                // First, make sure the node is visible by expanding parent nodes if needed
                expandPathToNode($targetCard);
                
                // Wait for expansions to complete, then navigate
                // Increased timeout and added extra sync step
                setTimeout(() => {
                    // Sync tracking variables before navigation to ensure accuracy
                    const currentLeft = parseFloat(orgChart.css('left')) || 0;
                    const currentTop = parseFloat(orgChart.css('top')) || 0;
                    const currentTransform = orgChart.css('transform');
                    
                    currentX = currentLeft;
                    currentY = currentTop;
                    
                    if (currentTransform && currentTransform !== 'none') {
                        const matrix = currentTransform.match(/matrix\(([^)]+)\)/);
                        if (matrix) {
                            const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
                            currentZoom = values[0];
                        }
                    }
                    
                    
                    navigateToCard($targetCard);
                }, 1200); // Increased timeout to allow for multiple expansions and layout settling
            }
        }// Expand path to node to make it visible
        function expandPathToNode($targetCard) {
            // Get the node ID from the target card
            const nodeId = $targetCard.data('id');
            if (!nodeId) return;
            
            // Find the node data
            const targetNode = orgData.nodes.find(n => n.id == nodeId);
            if (!targetNode) return;
            
            // Build the path from target node to root
            const pathToRoot = [];
            let currentNode = targetNode;
            
            // Trace upwards to find all parent nodes
            while (currentNode && currentNode.pid !== undefined && currentNode.pid !== null) {
                const parentNode = orgData.nodes.find(n => n.id == currentNode.pid);
                if (parentNode) {
                    pathToRoot.unshift(parentNode.id); // Add to beginning of array
                    currentNode = parentNode;
                } else {
                    break;
                }
            }
              // Expand all parent nodes in the path
            pathToRoot.forEach(parentId => {
                const $childrenGroup = $(`.children-group[data-parent="${parentId}"]`);
                if ($childrenGroup.hasClass('collapsed') || !$childrenGroup.is(':visible')) {
                    expandNode(parentId, true); // Skip auto-zoom for search navigation
                }
            });
            
        }        // Navigate to specific card
        function navigateToCard($targetCard) {
            if (!$targetCard || $targetCard.length === 0) return;
            
            const containerWidth = chartContainer.width();
            const containerHeight = chartContainer.height();
            const regularZoom = 1.0; // Standard zoom level for navigation
            
            // Get the current chart position and zoom
            const currentTransform = orgChart.css('transform');
            const currentLeft = parseFloat(orgChart.css('left')) || 0;
            const currentTop = parseFloat(orgChart.css('top')) || 0;
            
            // Update tracking variables to match actual DOM state
            currentX = currentLeft;
            currentY = currentTop;
            
            // Extract zoom from transform matrix if available
            if (currentTransform && currentTransform !== 'none') {
                const matrix = currentTransform.match(/matrix\(([^)]+)\)/);
                if (matrix) {
                    const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
                    currentZoom = values[0]; // scaleX value
                }
            }
            
            
            // Step 1: First adapt to regular zoom level if needed
            if (Math.abs(currentZoom - regularZoom) > 0.01) {
                
                // Adjust position proportionally when changing zoom
                const zoomRatio = regularZoom / currentZoom;
                const adjustedX = currentX * zoomRatio;
                const adjustedY = currentY * zoomRatio;
                
                // First animate to regular zoom with adjusted position
                animateZoomAndPosition(regularZoom, adjustedX, adjustedY);
                
                // Wait for zoom adaptation to complete, then navigate to card
                setTimeout(() => {
                    performCardNavigation($targetCard, containerWidth, containerHeight, regularZoom);
                }, 600); // Wait for zoom animation to complete
            } else {
                // Already at regular zoom, navigate directly
                performCardNavigation($targetCard, containerWidth, containerHeight, regularZoom);
            }
        }
        
        // Helper function to perform the actual card navigation
        function performCardNavigation($targetCard, containerWidth, containerHeight, targetZoom) {
            // Update current position after any zoom changes
            const currentLeft = parseFloat(orgChart.css('left')) || 0;
            const currentTop = parseFloat(orgChart.css('top')) || 0;
            currentX = currentLeft;
            currentY = currentTop;
            
            // Get the card's current position in the viewport (now at regular zoom)
            const cardRect = $targetCard[0].getBoundingClientRect();
            const containerRect = chartContainer[0].getBoundingClientRect();
            
            // Calculate the card's center relative to the container
            const cardCenterX = cardRect.left + (cardRect.width / 2) - containerRect.left;
            const cardCenterY = cardRect.top + (cardRect.height / 2) - containerRect.top;
            
            // Calculate how much we need to move the chart to center the card
            const deltaX = (containerWidth / 2) - cardCenterX;
            const deltaY = (containerHeight / 2) - cardCenterY;
            
            // Calculate the new target position (current position + delta)
            const targetX = currentX + deltaX;
            const targetY = currentY + deltaY;
       
            
            // Animate to the target position at regular zoom level
            animateZoomAndPosition(targetZoom, targetX, targetY);
            
            // Highlight the target card for 3 seconds
            setTimeout(() => {
                $targetCard.addClass('search-highlight');
                setTimeout(() => {
                    $targetCard.removeClass('search-highlight');
                }, 3000); // 3 seconds highlight duration
            }, 500);
        }

        // Export dropdown toggle
        $('#exportDropdown').click(function(e) {
            e.stopPropagation();
            const $dropdown = $('#exportMenu');
            const $controls = $('.export-controls');
            
            $controls.toggleClass('open');
            $dropdown.toggleClass('show');
        });        // Close export dropdown when clicking outside
        $(document).click(function() {
            $('.export-controls').removeClass('open');
            $('#exportMenu').removeClass('show');
        });

        // Grid cells
        // $('.grid-cell').click(function() {
        //     $('.grid-cell').removeClass('active');
        //     $(this).addClass('active');
        // });        // Person cards
        
        $('.person-card').click(function(event) {
            // Prevent trigger if this card is a filtered dot
            if ($(this).hasClass('filtered-dot')) {
            return;
            }
            if ($(event.target).closest('.expand-collapse-btn').length) {
        return;
            }
            const id = Number($(this).data('id')); 
            const node = orgData.nodes.find(n => n.id === id);

            if (id && node) {
                currentSelection = id;
                updateRightPanel('Person', id);
                highlightSelection($(this));
                
                // Auto-show right panel when clicking node
                if (!rightPanelVisible) {
                    toggleRightPanel();
                }
            }
        });         $('.org-card').click(function(event) {

            if ($(this).hasClass('filtered-dot')) {
            return;
            }
            // Prevent click if clicking on expand/collapse buttons
            if ($(event.target).closest('.expand-collapse-btn').length) {
                return;
            }
            
            const id = Number($(this).data('id')); 
            const node = orgData.nodes.find(n => n.id === id);

            if (id && node) {
                if (node.node_type === 'Department') {
                    currentSelection = id;
                    updateRightPanel('Department', id);
                    highlightSelection($(this));
                } else if (node.node_type === 'Organization') {
                    currentSelection = id;
                    updateRightPanel('Organization', id);
                    highlightSelection($(this));
                }
                
                // Auto-show right panel when clicking node
                if (!rightPanelVisible) {
                    toggleRightPanel();
                }
            }
        });

        // // Organization/Department cards
        // $('.org-card').click(function() {
        //     const type = $(this).data('type');
        //     if (type === 'department') {
        //         updateRightPanel('department', 'business-development');
        //     } else {
        //         updateRightPanel('organization', 'techsolutions');
        //     }
        //     highlightSelection($(this));
            
        //     // Auto-show right panel when clicking node
        //     if (!rightPanelVisible) {
        //         toggleRightPanel();
        //     }
        // });

        // Mini employee cards
        // $('.mini-card').click(function() {
        //     const randomPerson = Object.keys(orgData.persons)[Math.floor(Math.random() * Object.keys(orgData.persons).length)];
        //     updateRightPanel('person', randomPerson);
        //     highlightSelection($(this));
        // });        
        // Right panel close
        $('.panel-close').click(function() {
            toggleRightPanel();
        });        // Right panel back arrow
        $('.panel-back-arrow').click(function() {
            toggleRightPanel();
        });

        // Download button
        // $('.download-btn').click(function() {
        //     downloadChart();
        // });

        // Contact icons
       $(document).on('click', '.contact-icon', function () {
            const type = $(this).hasClass('email') ? 'email' : 
                        $(this).hasClass('phone') ? 'phone' :
                        $(this).hasClass('web') ? 'web' : 
                        $(this).hasClass('location') ? 'location' :
                        $(this).hasClass('linkedin') ? 'linkedin' : 
                        $(this).hasClass('facebook') ? 'facebook' : 
                        $(this).hasClass('x') ? 'x' : 'other';
                        
            handleContactAction(type);
        });

        // Thumbnails
        $('.thumbnail').click(function() {
            $('.thumbnail').removeClass('active');
            $(this).addClass('active');
            // Switch view logic here
        });         // Export option handlers
       $(document).on('click', '.export-option', function(e){
            e.preventDefault();
            e.stopPropagation();
            const format = $(this).data('format');
            
            // Close dropdown
            $('#exportMenu').removeClass('show');
            $('#exportDropdown').removeClass('active');            
            $('.export-controls').removeClass('open');
            
            // Set flag to skip preloader on potential reload after export
            sessionStorage.setItem('skipPreloader', 'true');
            
            // Handle export based on format
            if (format === 'png') {
                exportAsPNG();
            } else if (format === 'pdf') {
                exportAsPDF();
            } else if (format === 'csv') {
                exportAsCSV();
            } else if (format === 'excel') {
                exportAsExcel();
            }
            
        });

        // New toggle button handlers for overlapping sidebars
        $('#sidebarToggle').click(function() {
            toggleSidebar();
        });

        // Overlay click to close sidebars
        $('#sidebarOverlay').click(function() {
            if (sidebarVisible) {
                toggleSidebar();
            }
            if (rightPanelVisible) {
                toggleRightPanel();
            }
        });

        // Escape key to close sidebars
        $(document).keydown(function(e) {
            if (e.key === 'Escape') {
                if (sidebarVisible) {
                    toggleSidebar();
                }
                if (rightPanelVisible) {
                    toggleRightPanel();
                }
            }
          }); }
        
        // Expand/Collapse functionality
        $(document).on('click', '.expand-btn', function(e) {
            e.stopPropagation();
            const nodeId = $(this).data('parent');
            expandNode(nodeId);       
         });         $(document).on('click', '.collapse-btn', function(e) {
            e.stopPropagation();
            const nodeId = $(this).data('parent');
            collapseNode(nodeId);
        });        // Expand All / Collapse All functionality
        $(document).on('click', '#expandAll', function(e) {
            e.stopPropagation();
            expandAll();
        });

        $(document).on('click', '#collapseAll', function(e) {
            e.stopPropagation();
            collapseAll();
        });// Window resize handler to recalculate connectors
        $(window).resize(function() {
            recalculateConnectors();
        });

    // Zoom-aware wrapper for getBoundingClientRect that adjusts for current zoom level
    function getZoomAdjustedRect(element) {
        const rect = element.getBoundingClientRect();
         orgChartRect = orgChart[0].getBoundingClientRect();
        const orgChartPos = orgChart.offset();
        
        // Calculate the scale factor - getBoundingClientRect includes zoom effect
        // We need to get the unscaled dimensions
        return {
            left: (rect.left - orgChartRect.left) / currentZoom + orgChartPos.left,
            top: (rect.top - orgChartRect.top) / currentZoom + orgChartPos.top,
            right: (rect.right - orgChartRect.left) / currentZoom + orgChartPos.left,
            bottom: (rect.bottom - orgChartRect.top) / currentZoom + orgChartPos.top,
            width: rect.width / currentZoom,
            height: rect.height / currentZoom
        };
    }

    // Define recalculateConnectors function
    function recalculateConnectors() {
        performConnectorRecalculation();
    }
    function toggleSidebar() {
        sidebarVisible = !sidebarVisible;
        const overlay = $('#sidebarOverlay');
        const toggleBtn = $('#sidebarToggle');
        const floatingActions = $('.floating-actions');
          if (sidebarVisible) {
            $('#sidebar').removeClass('hidden');
            $('#applyFilters').addClass('active').text('▼ Menu');
            overlay.addClass('active');
            toggleBtn.removeClass('visible').addClass('active');
            // Hide floating actions when sidebar is open
            floatingActions.addClass('sidebar-open');
        } else {
            $('#sidebar').addClass('hidden');
            $('#applyFilters').removeClass('active').text('▶ Menu');
            // Only hide overlay if right panel is also hidden
            if (!rightPanelVisible) {
                overlay.removeClass('active');
            }
            toggleBtn.addClass('visible').removeClass('active');
            // Show floating actions when sidebar is hidden
            floatingActions.removeClass('sidebar-open');        }
    }

    function toggleRightPanel() {
        rightPanelVisible = !rightPanelVisible;
        const overlay = $('#sidebarOverlay');
        
        if (rightPanelVisible) {
            $('#rightPanel').removeClass('hidden');
            overlay.addClass('active');
        } else {
            $('#rightPanel').addClass('hidden');
            // Only hide overlay if sidebar is also hidden
            if (!sidebarVisible) {
                overlay.removeClass('active');
            }
        }
    }

    function adjustLayout() {
        // No need to adjust margins anymore since sidebars are overlapping
        // Chart container now uses full window space   
         }
    
    function updateRightPanel(type, id) {
        // Helper function to find node by id or personId
        function findNode(identifier, nodeType) {
            return orgData.nodes.find(node => {
                if (nodeType === 'Person') {
                    // For person type, check both id and personId fields
                    return node.node_type === 'Person' && (node.id == identifier || node.personId === identifier);
                } else {
                    // For department and organization, check by id and type
                    return node.node_type === nodeType && node.id == identifier;
                }
            });
        }        if (type === 'Person') {
            const person = findNode(id, 'Person');
            if (person) {
                $('#rightPanel .panel-title').text('Person');
                
                // Get blurred data if in preview mode
                const blurredData = isPreviewMode ? generateBlurredPersonDetails(person.id) : null;
                
                // Handle avatar display
                const avatarContent = person.img ? 
                    createLazyImage(person.img, 'profile-avatar-image', person.name + ' avatar') : 
                    `<span class="profile-avatar-text">${person.name ? person.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'UN'}</span>`;
                
                $('.profile-avatar').html(avatarContent);
                
                // Trigger lazy loading for avatar image
                setTimeout(() => {
                    observeLazyImages();
                    // Force load for avatar if it exists
                    const avatarImg = $('.profile-avatar-image');
                    if (avatarImg.length && avatarImg.hasClass('lazy-image')) {
                        loadImageLazily(avatarImg[0]);
                    }
                }, 50);
                  const detailsHtml = `
                    <div class="contact-icons" ${isPreviewMode ? 'style="display: none;"' : ''}>
                        ${!isPreviewMode && person.domain? `<div class="contact-icon web" title="Website">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                        </div>`: ''}
                        ${!isPreviewMode && person.email_id? `<div class="contact-icon email" title="Email">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                        </div>` : ''}
                        ${!isPreviewMode && person.boardline_number? `<div class="contact-icon phone" title="Phone">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                        </div>` : ''}
                        ${!isPreviewMode && person.primary_address? `<div class="contact-icon location" title="Location">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </div>` : ''}
                        ${!isPreviewMode && person.linkedin? `<div class="contact-icon linkedin" title="LinkedIn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 
                                    2.76 2.24 5 5 5h14c2.76 0 5-2.24 
                                    5-5v-14c0-2.76-2.24-5-5-5zm-11 
                                    19h-3v-10h3v10zm-1.5-11.3c-.97 
                                    0-1.75-.79-1.75-1.75s.78-1.75 
                                    1.75-1.75 1.75.79 
                                    1.75 1.75-.78 1.75-1.75 
                                    1.75zm13.5 11.3h-3v-5.5c0-1.38-.56-2.3-1.75-2.3-1 
                                    0-1.5.67-1.75 1.32-.09.21-.12.5-.12.79v5.69h-3v-10h3v1.38c.41-.63 
                                    1.12-1.5 2.75-1.5 2 0 3.5 1.31 3.5 4.14v5.98z"/>
                            </svg>
                        </div>` : ''}

                        ${!isPreviewMode && person.facebook? `<div class="contact-icon facebook" title="Facebook">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 12c0-5.52-4.48-10-10-10s-10 
                                    4.48-10 10c0 5 3.66 9.12 8.44 
                                    9.88v-6.99h-2.54v-2.89h2.54v-2.2c0-2.5 
                                    1.5-3.89 3.78-3.89 1.1 0 2.25.2 
                                    2.25.2v2.48h-1.27c-1.25 0-1.64.78-1.64 
                                    1.57v1.84h2.79l-.45 2.89h-2.34v6.99c4.78-.76 
                                    8.44-4.88 8.44-9.88z"/>
                            </svg>
                        </div>` : ''}

                        ${!isPreviewMode && person.x? `<div class="contact-icon x" title="X">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.39 3H17.7l-5.2 6.29L7.06 3H3l6.89 9.32L3 21h3.01l5.72-6.91L16.88 21H21l-7.14-9.64L20.39 3z"/>
                            </svg>
                        </div>` : ''}

                        ${!isPreviewMode && person.other? `<div class="contact-icon other" title="More">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="19" cy="12" r="2"/>
                            </svg>
                        </div>` : ''}
                        ${isPreviewMode ? `<div style="text-align: center; color: #666; font-style: italic; padding: 10px;">Contact options hidden in preview mode</div>` : ''}
                    </div>
                    <div class="details-grid">
                            <div class="detail-item">
                                <div class="detail-label">Full Name</div>
                                <div class="detail-value truncate-text" title="${isPreviewMode ? 'Blurred in preview' : (person.name || 'N/A')}">${isPreviewMode ? blurredData.name : (person.name || 'N/A')}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Designation</div>
                                <div class="detail-value truncate-text" title="${person.designation || 'N/A'}">${person.designation || 'N/A'}</div>
                            </div>
                            
                            <div class="detail-item">
                                <div class="detail-label">Email Address</div>
                                <div class="copy-wrapper" title="${isPreviewMode ? 'Blurred in preview' : (person.email_id || 'N/A')}">
                                <div class="detail-value">
                                    ${isPreviewMode ? blurredData.email_id : (person.email_id || 'N/A')}
                                    ${isPreviewMode ? '' : `<button class="copy-icon" title="Copy to clipboard" data-copy="${person.email_id || ''}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                        </svg>
                                    </button>`}
                                    </div>
                                </div>
                            </div>
                           ${person.boardline_number? `<div class="detail-item">
                                <div class="detail-label">Boardline Number</div>
                             <div class="copy-wrapper" title="${isPreviewMode ? 'Blurred in preview' : (person.boardline_number || 'N/A')}">
                                <div class="detail-value">
                                    ${isPreviewMode ? blurredData.boardline_number : (person.boardline_number || 'N/A')}
                                    ${isPreviewMode ? '' : `<button class="copy-icon" title="Copy to clipboard" data-copy="${person.boardline_number || ''}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11v14z"/>
                                        </svg>
                                    </button>`}
                                </div>
                                 </div>
                            </div>` : ''}
                            ${person.department? `<div class="detail-item">
                                <div class="detail-label">Department Name</div>
                                <div class="detail-value truncate-text" title="${person.department || 'N/A'}">${person.department || 'N/A'}</div>
                            </div>` : ''}
                            ${person.organization_name?   `<div class="detail-item">
                                <div class="detail-label">Organization Name</div>
                                <div class="detail-value truncate-text" title="${person.organization_name || 'N/A'}">${person.organization_name || 'N/A'}</div>
                            </div>` : '' }
                        
                           ${person.seniority_level ? `<div class="detail-item">
                                <div class="detail-label">Seniority Level</div>
                                <div class="detail-value truncate-text" title="${person.seniority_level || 'N/A'}">${person.seniority_level || 'N/A'}</div>
                            </div>` : ''}
                            ${person.job_function ? 
                            `<div class="detail-item">
                                <div class="detail-label">Job Function</div>
                                <div class="detail-value truncate-text" title="${person.job_function || 'N/A'}">${person.job_function || 'N/A'}</div>
                            </div>` : '' }
                            
                            
                            ${person.city ? `<div class="detail-item">
                                <div class="detail-label">City/Town</div>
                                <div class="detail-value truncate-text" title="${isPreviewMode ? 'Blurred in preview' : person.city}">${isPreviewMode ? blurredData.city : person.city}</div>
                            </div>` : ''}
                            ${person.state ? `<div class="detail-item">
                                <div class="detail-label">State/Province</div>
                                <div class="detail-value truncate-text" title="${isPreviewMode ? 'Blurred in preview' : person.state}">${isPreviewMode ? blurredData.state : person.state}</div>
                            </div>` : ''}
                            ${person.country ? `<div class="detail-item">
                                <div class="detail-label">Country/Region</div>
                                <div class="detail-value truncate-text" title="${isPreviewMode ? 'Blurred in preview' : person.country}">${isPreviewMode ? blurredData.country : person.country}</div>
                            </div>` : ''}
                             ${person.postal_code ? `<div class="detail-item">
                                <div class="detail-label">Postal Code</div>
                                <div class="detail-value truncate-text" title="${isPreviewMode ? 'Blurred in preview' : person.postal_code}">${isPreviewMode ? blurredData.postal_code : person.postal_code}</div>
                            </div>` : ''}
                            
            
                            ${person.education1 ? `<div class="detail-item">
                                <div class="detail-label">
                                    Educational Institute 1
                                </div>
                                <div class="detail-value truncate-text" title="${person.education1}">${person.education1}</div>
                            </div>` : ''}
                            ${person.education2 ? `<div class="detail-item">
                                <div class="detail-label">Educational Institute 2</div>
                                <div class="detail-value truncate-text" title="${person.education2}">${person.education2}</div>
                            </div>` : ''}
                            ${person.education3 ? `<div class="detail-item">
                                <div class="detail-label">Educational Institute 3</div>
                                <div class="detail-value truncate-text" title="${person.education3}">${person.education3}</div>
                            </div>` : ''}
                            ${person.previous_company1 ? `<div class="detail-item">
                                <div class="detail-label">
                                    Previous Company 1
                                </div>
                                <div class="detail-value truncate-text" title="${person.previous_company1}">${person.previous_company1}</div>
                            </div>` : ''}
                            ${person.previous_company2 ? `<div class="detail-item">
                                <div class="detail-label">Previous Company 2</div>
                                <div class="detail-value truncate-text" title="${person.previous_company2}">${person.previous_company2}</div>
                            </div>` : ''}
                            ${person.previous_company3 ? `<div class="detail-item">
                                <div class="detail-label">Previous Company 3</div>
                                <div class="detail-value truncate-text" title="${person.previous_company3}">${person.previous_company3}</div>
                            </div>` : ''}
                            ${person.previous_company4 ? `<div class="detail-item">
                                <div class="detail-label">Previous Company 4</div>
                                <div class="detail-value truncate-text" title="${person.previous_company4}">${person.previous_company4}</div>
                            </div>` : ''}
                            ${person.previous_company5 ? `<div class="detail-item">
                                <div class="detail-label">Previous Company 5</div>
                                <div class="detail-value truncate-text" title="${person.previous_company5}">${person.previous_company5}</div>
                            </div>` : ''}
                            ${person.notes ? `<div class="detail-item">
                                <div class="detail-label">Notes</div>
                                <div class="detail-value truncate-text" title="${person.notes}">${person.notes}</div>
                            </div>` : ''}
                    </div>
                    <div style="margin-top: 20px;">
                     ${person.primary_address ? `<div class="detail-item">
                                <div class="detail-label">Primary Address</div>
                                <div class="detail-value truncate-text" title="${isPreviewMode ? 'Blurred in preview' : person.primary_address}">${isPreviewMode ? blurredData.primary_address : person.primary_address}</div>
                            </div>` : ''}
                    </div>
                    <!-- Custom Fields Section -->
                    ${[1,2,3,4].map(num => {
                        const heading = person[`custom_heading${num}`];
                        const content = person[`custom_content${num}`];
                        const link = person[`custom_link${num}`];
                        const date = person[`custom_date${num}`];
                        
                        if (heading || content || link || date) {
                            return `
                            <div class="custom-field-section">
                                <div class="custom-field-header">
                                    ${heading ? `<h4 class="custom-heading">${heading}</h4>` : ''}
                                    ${date ? `<span class="custom-date">${date}</span>` : ''}
                                </div>
                                ${content ? `<div class="custom-content truncate-text" title="${content}">${content}</div>` : ''}
                                ${link ? `<div class="custom-link"><a href="${link}" target="_blank" class="contact-link">Source</a></div>` : ''}
                            </div>`;
                        }
                        return '';
                    }).join('')}
                `;
                  $('#rightPanel .profile-details').html(detailsHtml);
                
                // Check for truncated text elements after content is loaded
                setTimeout(checkTruncatedElements, 100);
            }
        } else if (type === 'Department') {
            const dept = findNode(id, 'Department');
            if (dept) {
                $('#rightPanel .panel-title').text('Department');                // Handle department avatar
                const avatarContent = dept.img ? 
                    createLazyImage(dept.img, 'profile-avatar-image', dept.department + ' avatar') : 
                    `<span class="profile-avatar-text">${dept.department ? dept.department.split(' ').map(n => n[0]).join('').toUpperCase() : 'UN'}</span>`;
                
                $('.profile-avatar').html(avatarContent);
                
                // Trigger lazy loading for avatar image
                setTimeout(() => {
                    observeLazyImages();
                    // Force load for avatar if it exists
                    const avatarImg = $('.profile-avatar-image');
                    if (avatarImg.length && avatarImg.hasClass('lazy-image')) {
                        loadImageLazily(avatarImg[0]);
                    }
                }, 50);
                   const detailsHtml = `
                    <div class="contact-icons">
                        ${dept.domain? `<div class="contact-icon web" title="Website">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                        </div>`: ''}
                        ${dept.email_id? `<div class="contact-icon email" title="Email">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                        </div>` : ''}
                        ${dept.boardline_number? `<div class="contact-icon phone" title="Phone">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                        </div>` : ''}
                        ${dept.primary_address? `<div class="contact-icon location" title="Location">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </div>` : ''}
                        ${dept.linkedin? `<div class="contact-icon linkedin" title="LinkedIn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 
                                    2.76 2.24 5 5 5h14c2.76 0 5-2.24 
                                    5-5v-14c0-2.76-2.24-5-5-5zm-11 
                                    19h-3v-10h3v10zm-1.5-11.3c-.97 
                                    0-1.75-.79-1.75-1.75s.78-1.75 
                                    1.75-1.75 1.75.79 
                                    1.75 1.75-.78 1.75-1.75 
                                    1.75zm13.5 11.3h-3v-5.5c0-1.38-.56-2.3-1.75-2.3-1 
                                    0-1.5.67-1.75 1.32-.09.21-.12.5-.12.79v5.69h-3v-10h3v1.38c.41-.63 
                                    1.12-1.5 2.75-1.5 2 0 3.5 1.31 3.5 4.14v5.98z"/>
                            </svg>
                        </div>` : ''}

                        ${dept.facebook? `<div class="contact-icon facebook" title="Facebook">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 12c0-5.52-4.48-10-10-10s-10 
                                    4.48-10 10c0 5 3.66 9.12 8.44 
                                    9.88v-6.99h-2.54v-2.89h2.54v-2.2c0-2.5 
                                    1.5-3.89 3.78-3.89 1.1 0 2.25.2 
                                    2.25.2v2.48h-1.27c-1.25 0-1.64.78-1.64 
                                    1.57v1.84h2.79l-.45 2.89h-2.34v6.99c4.78-.76 
                                    8.44-4.88 8.44-9.88z"/>
                            </svg>
                        </div>` : ''}

                        ${dept.x? `<div class="contact-icon x" title="X">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.39 3H17.7l-5.2 6.29L7.06 3H3l6.89 9.32L3 21h3.01l5.72-6.91L16.88 21H21l-7.14-9.64L20.39 3z"/>
                            </svg>
                        </div>` : ''}

                        ${dept.other? `<div class="contact-icon other" title="More">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="19" cy="12" r="2"/>
                            </svg>
                        </div>` : ''}
                    </div>
                    <div class="details-grid">
                       ${dept.department? `<div class="detail-item">
                                <div class="detail-label">Department Name</div>
                                <div class="detail-value truncate-text" title="${dept.department || 'N/A'}">${dept.department || 'N/A'}</div>
                            </div>`: ''}   
                        ${dept.organization_name? `<div class="detail-item">
                                <div class="detail-label">Organization Name</div>
                                <div class="detail-value truncate-text" title="${dept.organization_name || 'N/A'}">${dept.organization_name || 'N/A'}</div>
                            </div>` : ''}
                          
                            ${dept.email_id? `<div class="detail-item">
                                <div class="detail-label">Email Address</div>
                                <div class="copy-wrapper" title="${dept.email_id || 'N/A'}">
                                <div class="detail-value">
                                    ${dept.email_id || 'N/A'}
                                    <button class="copy-icon" title="Copy to clipboard" data-copy="${dept.email_id || ''}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                        </svg>
                                    </button>
                                    </div>
                                </div>
                            </div>` : ''}
                            ${dept.boardline_number? `<div class="detail-item">
                                <div class="detail-label">Boardline Number</div>
                             <div class="copy-wrapper" title="${dept.boardline_number || 'N/A'}">
                                <div class="detail-value">
                                    ${dept.boardline_number || 'N/A'}
                                    <button class="copy-icon" title="Copy to clipboard" data-copy="${dept.boardline_number || ''}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                        </svg>
                                    </button>
                                </div>
                                 </div>
                            </div>`: ''}
                           
                             ${dept.industry ? `<div class="detail-item">
                                <div class="detail-label">Industry</div>
                                <div class="detail-value truncate-text" title="${dept.industry}">${dept.industry}</div>
                            </div>` : ''}

                             ${dept.employee_range ? `<div class="detail-item">
                                <div class="detail-label">Employee Range</div>
                                <div class="detail-value truncate-text" title="${dept.employee_range}">${dept.employee_range}</div>
                            </div>` : ''}

                             ${dept.solution_offered ? `<div class="detail-item">
                                <div class="detail-label">Solution Offered</div>
                                <div class="detail-value truncate-text" title="${dept.solution_offered}">${dept.solution_offered}</div>
                            </div>` : ''}
                            

                          
                            
                            
                            ${dept.city ? `<div class="detail-item">
                                <div class="detail-label">City/Town</div>
                                <div class="detail-value truncate-text" title="${dept.city}">${dept.city}</div>
                            </div>` : ''}
                            ${dept.state ? `<div class="detail-item">
                                <div class="detail-label">State/Province</div>
                                <div class="detail-value truncate-text" title="${dept.state}">${dept.state}</div>
                            </div>` : ''}
                            ${dept.country ? `<div class="detail-item">
                                <div class="detail-label">Country/Region</div>
                                <div class="detail-value truncate-text" title="${dept.country}">${dept.country}</div>
                            </div>` : ''}
                             ${dept.postal_code ? `<div class="detail-item">
                                <div class="detail-label">Postal Code</div>
                                <div class="detail-value truncate-text" title="${dept.postal_code}">${dept.postal_code}</div>
                            </div>` : ''}
                            
    
                            ${dept.notes ? `<div class="detail-item">
                                <div class="detail-label">Notes</div>
                                <div class="detail-value truncate-text" title="${dept.notes}">${dept.notes}</div>
                            </div>` : ''}
                    </div>
                    <div style="margin-top: 20px;">
                    ${dept.primary_address ? `<div class="detail-item">
                                <div class="detail-label">Primary Address</div>
                                <div class="detail-value truncate-text" title="${dept.primary_address}">${dept.primary_address}</div>
                            </div>` : ''}
                    </div>
                    <!-- Custom Fields Section -->
                    ${[1,2,3,4].map(num => {
                        const heading = dept[`custom_heading${num}`];
                        const content = dept[`custom_content${num}`];
                        const link = dept[`custom_link${num}`];
                        const date = dept[`custom_date${num}`];
                        
                        if (heading || content || link || date) {
                            return `
                            <div class="custom-field-section">
                                <div class="custom-field-header">
                                    ${heading ? `<h4 class="custom-heading">${heading}</h4>` : ''}
                                    ${date ? `<span class="custom-date">${date}</span>` : ''}
                                </div>
                                ${content ? `<div class="custom-content truncate-text" title="${content}">${content}</div>` : ''}
                                ${link ? `<div class="custom-link"><a href="${link}" target="_blank" class="contact-link">Source</a></div>` : ''}
                            </div>`;
                        }
                        return '';
                    }).join('')}
                `;
                  $('#rightPanel .profile-details').html(detailsHtml);
                // Check for truncated text elements after content is loaded
                setTimeout(checkTruncatedElements, 100);
            }
        } else if (type === 'Organization') {
            const org = findNode(id, 'Organization');
            if (org) {
                $('#rightPanel .panel-title').text('Organization');                  // Handle organization avatar
                const avatarContent = org.img ? 
                    createLazyImage(org.img, 'profile-avatar-image', org.org_name + ' avatar') : 
                    `<span class="profile-avatar-text">ORG</span>`;
                
                $('.profile-avatar').html(avatarContent);
                
                // Trigger lazy loading for avatar image
                setTimeout(() => {
                    observeLazyImages();
                    // Force load for avatar if it exists
                    const avatarImg = $('.profile-avatar-image');
                    if (avatarImg.length && avatarImg.hasClass('lazy-image')) {
                        loadImageLazily(avatarImg[0]);
                    }
                }, 50);
                 const detailsHtml = `
                    <div class="contact-icons">
                        ${org.domain? `<div class="contact-icon web" title="Website">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                        </div>`: ''}
                        ${org.email_id? `<div class="contact-icon email" title="Email">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                        </div>` : ''}
                        ${org.boardline_number? `<div class="contact-icon phone" title="Phone">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                        </div>` : ''}
                        ${org.primary_address? `<div class="contact-icon location" title="Location">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </div>` : ''}
                        ${org.linkedin? `<div class="contact-icon linkedin" title="LinkedIn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 
                                    2.76 2.24 5 5 5h14c2.76 0 5-2.24 
                                    5-5v-14c0-2.76-2.24-5-5-5zm-11 
                                    19h-3v-10h3v10zm-1.5-11.3c-.97 
                                    0-1.75-.79-1.75-1.75s.78-1.75 
                                    1.75-1.75 1.75.79 
                                    1.75 1.75-.78 1.75-1.75 
                                    1.75zm13.5 11.3h-3v-5.5c0-1.38-.56-2.3-1.75-2.3-1 
                                    0-1.5.67-1.75 1.32-.09.21-.12.5-.12.79v5.69h-3v-10h3v1.38c.41-.63 
                                    1.12-1.5 2.75-1.5 2 0 3.5 1.31 3.5 4.14v5.98z"/>
                            </svg>
                        </div>` : ''}

                        ${org.facebook? `<div class="contact-icon facebook" title="Facebook">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 12c0-5.52-4.48-10-10-10s-10 
                                    4.48-10 10c0 5 3.66 9.12 8.44 
                                    9.88v-6.99h-2.54v-2.89h2.54v-2.2c0-2.5 
                                    1.5-3.89 3.78-3.89 1.1 0 2.25.2 
                                    2.25.2v2.48h-1.27c-1.25 0-1.64.78-1.64 
                                    1.57v1.84h2.79l-.45 2.89h-2.34v6.99c4.78-.76 
                                    8.44-4.88 8.44-9.88z"/>
                            </svg>
                        </div>` : ''}

                        ${org.x? `<div class="contact-icon x" title="X">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.39 3H17.7l-5.2 6.29L7.06 3H3l6.89 9.32L3 21h3.01l5.72-6.91L16.88 21H21l-7.14-9.64L20.39 3z"/>
                            </svg>
                        </div>` : ''}

                        ${org.other? `<div class="contact-icon other" title="More">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="19" cy="12" r="2"/>
                            </svg>
                        </div>` : ''}
                    </div>
                    <div class="details-grid">
                            <div class="detail-item">
                                <div class="detail-label">Organization Name</div>
                                <div class="detail-value truncate-text" title="${org.org_name || 'N/A'}">${org.org_name || 'N/A'}</div>
                            </div>
                          
                            <div class="detail-item">
                                <div class="detail-label">Email Address</div>
                                <div class="copy-wrapper" title="${org.email_id || 'N/A'}">
                                <div class="detail-value">
                                    ${org.email_id || 'N/A'}
                                    <button class="copy-icon" title="Copy to clipboard" data-copy="${org.email_id || ''}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                        </svg>
                                    </button>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Boardline Number</div>
                             <div class="copy-wrapper" title="${org.boardline_number || 'N/A'}">
                                <div class="detail-value">
                                    ${org.boardline_number || 'N/A'}
                                    <button class="copy-icon" title="Copy to clipboard" data-copy="${org.boardline_number || ''}">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                        </svg>
                                    </button>
                                </div>
                                 </div>
                            </div>
                           
                             ${org.industry ? `<div class="detail-item">
                                <div class="detail-label">Industry</div>
                                <div class="detail-value truncate-text" title="${org.industry}">${org.industry}</div>
                            </div>` : ''}

                             ${org.employee_range ? `<div class="detail-item">
                                <div class="detail-label">Employee Range</div>
                                <div class="detail-value truncate-text" title="${org.employee_range}">${org.employee_range}</div>
                            </div>` : ''}

                             ${org.solution_offered ? `<div class="detail-item">
                                <div class="detail-label">Solution Offered</div>
                                <div class="detail-value truncate-text" title="${org.solution_offered}">${org.solution_offered}</div>
                            </div>` : ''}
                        
                          
                            
                            ${org.city ? `<div class="detail-item">
                                <div class="detail-label">City/Town</div>
                                <div class="detail-value truncate-text" title="${org.city}">${org.city}</div>
                            </div>` : ''}
                            ${org.state ? `<div class="detail-item">
                                <div class="detail-label">State/Province</div>
                                <div class="detail-value truncate-text" title="${org.state}">${org.state}</div>
                            </div>` : ''}
                            ${org.country ? `<div class="detail-item">
                                <div class="detail-label">Country/Region</div>
                                <div class="detail-value truncate-text" title="${org.country}">${org.country}</div>
                            </div>` : ''}
                             ${org.postal_code ? `<div class="detail-item">
                                <div class="detail-label">Postal Code</div>
                                <div class="detail-value truncate-text" title="${org.postal_code}">${org.postal_code}</div>
                            </div>` : ''}
                            
    
                            ${org.notes ? `<div class="detail-item">
                                <div class="detail-label">Notes</div>
                                <div class="detail-value truncate-text" title="${org.notes}">${org.notes}</div>
                            </div>` : ''}
                    </div>
                    
                    <div style="margin-top: 20px;">
                    ${org.primary_address ? `<div class="detail-item">
                                <div class="detail-label">Primary Address</div>
                                <div class="detail-value truncate-text" title="${org.primary_address}">${org.primary_address}</div>
                            </div>` : ''}
                    </div>
                    <!-- Custom Fields Section -->
                    ${[1,2,3,4].map(num => {
                        const heading = org[`custom_heading${num}`];
                        const content = org[`custom_content${num}`];
                        const link = org[`custom_link${num}`];
                        const date = org[`custom_date${num}`];
                        
                        if (heading || content || link || date) {
                            return `
                            <div class="custom-field-section">
                                <div class="custom-field-header">
                                    ${heading ? `<h4 class="custom-heading">${heading}</h4>` : ''}
                                    ${date ? `<span class="custom-date">${date}</span>` : ''}
                                </div>
                                ${content ? `<div class="custom-content truncate-text" title="${content}">${content}</div>` : ''}
                                ${link ? `<div class="custom-link"><a href="${link}" target="_blank" class="contact-link">Source</a></div>` : ''}
                            </div>`;
                        }
                        return '';
                    }).join('')}
                `;
                  $('#rightPanel .profile-details').html(detailsHtml);
                // Check for truncated text elements after content is loaded
                setTimeout(checkTruncatedElements, 100);
            }
        }
        
        // Add copy functionality to copy icons
        setupCopyFunctionality();
    }
    
    function setupCopyFunctionality() {
        // Remove existing click handlers to prevent duplicates
        $(document).off('click', '.copy-icon');
        
        // Add click handler for copy icons
        $(document).on('click', '.copy-icon', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const textToCopy = $(this).data('copy');
            
            // Use modern clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Visual feedback
                    const $copyIcon = $(this);
                    const originalColor = $copyIcon.css('color');
                    $copyIcon.css('color', '#22c55e');
                    
                    setTimeout(() => {
                        $copyIcon.css('color', originalColor);
                    }, 1000);
                }).catch(err => {
                    console.error('Failed to copy text:', err);
                    fallbackCopy(textToCopy, $(this));
                });
            } else {
                // Fallback for older browsers
                fallbackCopy(textToCopy, $(this));
            }
        });
    }

    function fallbackCopy(text, $icon) {
        // Create a temporary textarea to copy text
        const tempTextarea = $('<textarea>');
        tempTextarea.val(text);
        tempTextarea.css({
            position: 'absolute',
            left: '-9999px',
            top: '-9999px'
        });
        $('body').append(tempTextarea);
        tempTextarea.select();
        
        try {
            document.execCommand('copy');
            
            // Visual feedback
            const originalColor = $icon.css('color');
            $icon.css('color', '#22c55e');
            
            setTimeout(() => {
                $icon.css('color', originalColor);
            }, 1000);
            
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
        
        tempTextarea.remove();
    }

    function highlightSelection(element) {
        // Remove previous highlights
        $('.person-card, .org-card, .mini-card').removeClass('selected');
        
        // Add highlight to selected element
        element.addClass('selected');
        
        // Add CSS for selected state
        if (!$('#dynamic-styles').length) {
            $('<style id="dynamic-styles">').appendTo('head');
        }
        
        $('#dynamic-styles').html(`
            .selected {
                
            }
        `);
    }    function handleContactAction(type) {
       const person = orgData.nodes.find(node =>
        ['Person', 'Department', 'Organization'].includes(node.node_type) &&
        (node.id == currentSelection || node.personId === currentSelection)
);
        if (!person) return;

        switch(type) {
            case 'email':
                window.open(`mailto:${person.email_id}`);
                break;
            case 'phone':
                window.open(`tel:${person.boardline_number}`);
                break;
            case 'web':
                window.open(`https://${person.domain}`, '_blank');
                break;
            case 'location':
                const address = encodeURIComponent(person.primary_address);
                window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                break;
            case 'linkedin':
                window.open(person.linkedin, '_blank');
                break;
            case 'facebook':
                window.open(person.facebook, '_blank');
                break;
            case 'x':
                window.open(person.x, '_blank');
                break;
            case 'other':
                window.open(person.other, '_blank');
                break;
            default:
                console.warn(`Unknown type: ${type}`);
                break;

        }
    }

    // function downloadChart() {
    //     // Simple download simulation
    //     const canvas = document.createElement('canvas');
    //     const ctx = canvas.getContext('2d');
    //     canvas.width = 800;
    //     canvas.height = 600;
        
    //     // Draw a simple representation
    //     ctx.fillStyle = '#4fc3f7';
    //     ctx.fillRect(0, 0, canvas.width, canvas.height);
    //     ctx.fillStyle = 'white';
    //     ctx.font = '20px Arial';
    //     ctx.fillText('TechSolutions Organization Chart', 50, 50);
        
    //     // Create download link
    //     const link = document.createElement('a');
    //     link.download = 'organization-chart.png';
    //     link.href = canvas.toDataURL();
    //     link.click();
    // }

    // Animation effects
    function addAnimations() {
        // Fade in animation for cards
        $('.person-card, .org-card').each(function(index) {
            $(this).css({
                'opacity': '0',
                'transform': 'translateY(20px)'
            }).delay(index * 100).animate({
                'opacity': '1'
            }, 500).css('transform', 'translateY(0)');
        });        // Pulse effect for new selections
        $(document).on('click', '.person-card, .org-card, .mini-card', function() {
            $(this).addClass('pulse');
            setTimeout(() => {
                $(this).removeClass('pulse');
            }, 600);
        });

        // White dot click handler
        $(document).on('click', '.filter-white-dot', function(e) {
            e.stopPropagation();
            const nodeId = $(this).data('node-id');
            const nodeData = orgData.nodes.find(node => node.id == nodeId);
            
            if (nodeData) {
                // Show node details in right panel
                updateRightPanel(nodeData.node_type, nodeId);
                
                // Add a temporary highlight effect
                $(this).addClass('white-dot-clicked');
                setTimeout(() => {
                    $(this).removeClass('white-dot-clicked');
                }, 1000);
            }
        });
    }

    // Add pulse animation CSS
    $('<style>').text(`
        .pulse {
            animation: pulse 0.6s;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .person-card, .org-card, .mini-card {
            transition: all 0.3s ease;
        }
    `).appendTo('head');

    // Initialize animations
    addAnimations();

    // Initialize layout
    adjustLayout();

   
    setTimeout(() => {
        if (orgChart.length) {
            const containerWidth = chartContainer.width();
            const chartWidth = orgChart.width();
            
            if (chartWidth > containerWidth) {
                chartContainer.scrollLeft((chartWidth - containerWidth) / 2);
            }
        }    }, 500);// Zoom functionality
    let currentZoom = 1;
    const minZoom = 0.1;  // Increased zoom out level (was 0.25)
    const maxZoom = 3;
    const zoomStep = 0.1;    // Mouse wheel zoom
    chartContainer[0].addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const delta = e.deltaY;
        const zoomDirection = delta > 0 ? -1 : 1;
        const newZoom = Math.min(Math.max(currentZoom + (zoomDirection * zoomStep), minZoom), maxZoom);
        
        if (newZoom !== currentZoom) {
            // Get mouse position relative to container
            const rect = chartContainer[0].getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom center point
            const zoomCenterX = (mouseX - currentX) / currentZoom;
            const zoomCenterY = (mouseY - currentY) / currentZoom;
            
            // Update zoom
            currentZoom = newZoom;
              // Adjust position to keep zoom centered on mouse
            currentX = mouseX - (zoomCenterX * currentZoom);
            currentY = mouseY - (zoomCenterY * currentZoom);
              // Apply zoom and position
            orgChart.css({
                'transform': `scale(${currentZoom})`,
                'left': currentX + 'px',
                'top': currentY + 'px'
            });
            
            // Recalculate connectors after zoom change
            setTimeout(() => {
                performConnectorRecalculation();
            }, 50);
        }
    }, { passive: false });
    
    // Touch zoom (pinch-to-zoom) support
    let touchStartDistance = 0;
    let touchStartZoom = 1;
    let touchZoomCenter = { x: 0, y: 0 };
    let isZooming = false;    
    chartContainer[0].addEventListener('touchstart', function(e) {
        const touches = e.touches;
        
        // Handle two-finger touch for zoom
        if (touches.length === 2) {
            e.preventDefault();
            isZooming = true;
            
            // Calculate initial distance between fingers
            const touch1 = touches[0];
            const touch2 = touches[1];
            touchStartDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            touchStartZoom = currentZoom;
            
            // Calculate center point between fingers
            const rect = chartContainer[0].getBoundingClientRect();           
             touchZoomCenter.x = ((touch1.clientX + touch2.clientX) / 2) - rect.left;
            touchZoomCenter.y = ((touch1.clientY + touch2.clientY) / 2) - rect.top;
            // Recalculate connectors after zoom change
                    setTimeout(() => {
                        performConnectorRecalculation();
                    }, 50);
        }
    }, { passive: false });
    
    chartContainer[0].addEventListener('touchmove', function(e) {
        const touches = e.touches;
        
        // Handle two-finger zoom
        if (touches.length === 2 && isZooming) {
            e.preventDefault();
            
            const touch1 = touches[0];
            const touch2 = touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) + 
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            if (touchStartDistance > 0) {
                // Calculate zoom factor
                const zoomFactor = currentDistance / touchStartDistance;
                const newZoom = Math.min(Math.max(touchStartZoom * zoomFactor, minZoom), maxZoom);
                
                if (newZoom !== currentZoom) {
                    // Calculate zoom center point
                    const zoomCenterX = (touchZoomCenter.x - currentX) / currentZoom;
                    const zoomCenterY = (touchZoomCenter.y - currentY) / currentZoom;
                    
                    // Update zoom
                    currentZoom = newZoom;
                    
                    // Adjust position to keep zoom centered on pinch center
                    currentX = touchZoomCenter.x - (zoomCenterX * currentZoom);
                    currentY = touchZoomCenter.y - (zoomCenterY * currentZoom);                      // Apply zoom and position
                    orgChart.css({
                        'transform': `scale(${currentZoom})`,
                        'left': currentX + 'px',
                        'top': currentY + 'px'
                    });
                    
                    // Recalculate connectors after zoom change
                    setTimeout(() => {
                        performConnectorRecalculation();
                    }, 50);
                }
            }
        }
    }, { passive: false });
    
    chartContainer[0].addEventListener('touchend', function(e) {
        const touches = e.touches;
        
        // Reset zoom touch tracking when fingers are lifted        if (touches.length < 2) {
            touchStartDistance = 0;
            touchStartZoom = currentZoom;
            isZooming = false;
        
    }, { passive: false });
    
    // Make organization chart draggable from anywhere in the canvas
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    
    // Mouse events for dragging - listen on the entire chart container
    chartContainer.on('mousedown', function(e) {
        // Don't start drag if clicking on buttons, cards, or interactive elements
        if ($(e.target).closest('.expand-collapse-btn, .org-card, .person-card').length > 0) {
            return;
        }
        
        isDragging = true;
        orgChart.addClass('dragging');
        chartContainer.css('cursor', 'grabbing');
        
        startX = e.clientX - currentX;
        startY = e.clientY - currentY;
        
        e.preventDefault();
    });
      $(document).on('mousemove', function(e) {
        if (!isDragging) return;
        
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        
        orgChart.css({
            'left': currentX + 'px',
            'top': currentY + 'px',
            'transform': `scale(${currentZoom})` // Maintain current zoom during drag
        });
    });
      $(document).on('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            orgChart.removeClass('dragging');
            chartContainer.css('cursor', 'grab');
        }
    });      // Touch events for mobile dragging - single finger only (two-finger is handled by zoom)
    chartContainer.on('touchstart.drag', function(e) {
        const touches = e.originalEvent.touches;
        
        // Only handle single finger touch for dragging (zoom handles two fingers)
        if (touches.length !== 1 || isZooming) {
            return;
        }
        
        if ($(e.target).closest('.expand-collapse-btn, .org-card, .person-card').length > 0) {
            return;
        }
        
        isDragging = true;
        orgChart.addClass('dragging');
        chartContainer.css('cursor', 'grabbing');
        
        const touch = touches[0];
        startX = touch.clientX - currentX;
        startY = touch.clientY - currentY;
        
        e.preventDefault();
        // Recalculate connectors after zoom change
                    setTimeout(() => {
                        performConnectorRecalculation();
                    }, 50);
    });
    
    $(document).on('touchmove.drag', function(e) {
        const touches = e.originalEvent.touches;
        
        // Only continue dragging with single finger and not zooming
        if (!isDragging || touches.length !== 1 || isZooming) {
            // Stop dragging if more fingers are added or zooming started
            if (touches.length > 1 && isDragging) {
                isDragging = false;
                orgChart.removeClass('dragging');
                chartContainer.css('cursor', 'grab');
            }
            return;
        }
        
        const touch = touches[0];
        currentX = touch.clientX - startX;
        currentY = touch.clientY - startY;
        
        orgChart.css({
            'left': currentX + 'px',
            'top': currentY + 'px',
            'transform': `scale(${currentZoom})` // Maintain current zoom during drag
        });
        // Recalculate connectors after zoom change
                    setTimeout(() => {
                        performConnectorRecalculation();
                    }, 50);
        
        e.preventDefault();
    });
    
    $(document).on('touchend.drag', function(e) {
        const touches = e.originalEvent.touches;
        
        // End dragging when no fingers remain
        if (isDragging && touches.length === 0) {
            isDragging = false;
            orgChart.removeClass('dragging');
            chartContainer.css('cursor', 'grab');
        }
    });
      // Initialize chart position for full window
    const container = $('.chart-container');
    const windowWidth = $(window).width();
    const windowHeight = $(window).height();
    
    // Wait for chart to be rendered, then center it
    setTimeout(() => {
        const chartWidth = orgChart.outerWidth();
        const chartHeight = orgChart.outerHeight();
        
        // Center the chart in the full window
        currentX = (windowWidth - chartWidth) / 2;
        currentY = Math.max(100, (windowHeight - chartHeight) / 2);
          orgChart.css({
            'left': currentX + 'px',
            'top': currentY + 'px',
            'transform': `scale(${currentZoom})`
        });
    }, 100);
    
    // Recenter chart when window is resized
    $(window).on('resize', function() {
        const newWindowWidth = $(window).width();
        const newWindowHeight = $(window).height();
        const chartWidth = orgChart.outerWidth();
        const chartHeight = orgChart.outerHeight();
        
        // Maintain relative position when window resizes
        const relativeX = currentX / windowWidth;
        const relativeY = currentY / windowHeight;
        
        currentX = relativeX * newWindowWidth;
        currentY = relativeY * newWindowHeight;
        
        orgChart.css({
            'left': currentX + 'px',
            'top': currentY + 'px',
            'transform': `scale(${currentZoom})`
        });
    });      // Export functionality
   

    // Helper function to get current visible elements for export
    function getCurrentVisibleChart() {
        // Clone the chart container
        const chartClone = orgChart.clone();
        
        // Remove hidden elements from clone
        chartClone.find('.org-card, .person-card, .dept-card').each(function() {
            const $element = $(this);
            const originalElement = orgChart.find(`[data-id="${$element.attr('data-id')}"]`);
            
            // Check if original element is hidden or filtered out
            if (originalElement.length === 0 || 
                originalElement.is(':hidden') || 
                originalElement.hasClass('filtered-out') ||
                originalElement.css('display') === 'none' ||
                originalElement.css('visibility') === 'hidden') {
                $element.remove();
            }
        });
        
        // Remove connection lines that don't have corresponding visible elements
        chartClone.find('.connection-line').each(function() {
            const $line = $(this);
            const fromId = $line.data('from');
            const toId = $line.data('to');
            
            // Check if both connected elements are still visible in clone
            const fromExists = chartClone.find(`[data-id="${fromId}"]`).length > 0;
            const toExists = chartClone.find(`[data-id="${toId}"]`).length > 0;
            
            if (!fromExists || !toExists) {
                $line.remove();
            }
        });
        
        return chartClone;
    }    // Helper function to get current visible data for CSV/Excel export
    function getCurrentVisibleData() {
        const visibleData = [];
        
        // Get all visible cards in the DOM that are not filtered out or hidden
        const visibleCards = orgChart.find('.org-card, .person-card, .dept-card')
                                   .filter(function() {
                                       const $this = $(this);
                                       return $this.is(':visible') && 
                                              !$this.hasClass('filtered-out') &&
                                              !$this.hasClass('filtered-dot') && // Exclude filtered dots
                                              !$this.hasClass('hidden') &&
                                              $this.css('display') !== 'none' && 
                                              $this.css('visibility') !== 'hidden' &&
                                              $this.css('opacity') !== '0';
                                   });
        
        
        visibleCards.each(function() {
            const $card = $(this);
            const dataId = $card.attr('data-id');
            
            // Handle the case where dataId might be 0 or string "0"
            if (dataId !== undefined && dataId !== null && dataId !== '') {
                // Find the corresponding data in orgData.nodes
                const itemData = orgData.nodes.find(node => 
                    node.id !== undefined && node.id !== null && 
                    node.id.toString() === dataId.toString()
                );
                
                if (itemData) {
                    visibleData.push(itemData);
                } else {
                    console.warn(`Could not find data for card with ID: ${dataId}`);
                }
            }
        });
          console.log(`Exporting ${visibleData.length} items`);
        return visibleData;
    }

    // Helper function to load all images in container before export
    function loadAllImagesForExport(container) {
        return new Promise((resolve, reject) => {
            const images = container.find('img[data-src]');
            const promises = [];
            
            images.each(function() {
                const img = $(this);
                const src = img.data('src');
                
                if (src && !img.hasClass('loaded')) {
                    const promise = new Promise((imgResolve) => {
                        const newImg = new Image();
                        newImg.onload = () => {
                            img.attr('src', src);
                            img.addClass('loaded');
                            imgResolve();
                        };
                        newImg.onerror = () => {
                            // Use placeholder on error
                            img.attr('src', IMAGE_CONFIG.placeholderSvg);
                            img.addClass('error');
                            imgResolve();
                        };
                        newImg.src = src;
                    });
                    promises.push(promise);
                }
            });
            
            if (promises.length === 0) {
                resolve();
            } else {
                Promise.all(promises).then(resolve).catch(reject);
            }
        });
    }    // Loading animation functions
    function showExportLoadingAnimation() {
        // Remove existing loader if any
        $('#exportLoader').remove();
          const loader = $(`
            <div id="exportLoader" class="export-loading-overlay">
                <div class="export-loading-container">
                    <div class="org-chart-loader">
                        <!-- CEO Node -->
                        <div class="org-node ceo-node"></div>
                        
                        <!-- Connecting Lines -->
                        <div class="org-line vertical-line"></div>
                        <div class="org-line horizontal-line"></div>
                        <div class="org-line branch-line-1"></div>
                        <div class="org-line branch-line-2"></div>
                        <div class="org-line branch-line-3"></div>
                        
                        <!-- Manager Nodes -->
                        <div class="org-node manager-node-1">HR</div>
                        <div class="org-node manager-node-2">IT</div>
                        <div class="org-node manager-node-3">FIN</div>
                        
                        <!-- Employee Nodes -->
                        <div class="org-node employee-node-1">👤</div>
                        <div class="org-node employee-node-2">👤</div>
                        <div class="org-node employee-node-3">👤</div>
                        <div class="org-node employee-node-4">👤</div>
                        
                        <!-- Data Flow Animation -->
                        <div class="data-flow flow-1"></div>
                        <div class="data-flow flow-2"></div>
                        <div class="data-flow flow-3"></div>
                        
                        <!-- Ambient Geometric Shapes -->
                        <div class="geometric-ambient ambient-triangle"></div>
                        <div class="geometric-ambient ambient-circle"></div>
                        <div class="geometric-ambient ambient-square"></div>
                    </div>
                    
                    <h3>Exporting Organization Chart</h3>
                    <p>Processing hierarchy data and generating your file...</p>
                    
                    <div class="export-status" id="exportStatus">Analyzing organizational structure...</div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    
                    <div class="file-icon"></div>
                </div>
            </div>
        `);
        
        $('body').append(loader);
        
        // Animate progress bar and status messages with 5-second total duration
        const statusMessages = [
            'Analyzing organizational structure...',
            'Loading employee images...',
            'Processing hierarchy relationships...',
            'Optimizing chart layout...',
            'Generating export file...',
            'Finalizing document...'
        ];
        
        let messageIndex = 0;
        const statusElement = loader.find('#exportStatus');
        
        // Update status messages every 800ms
        const statusInterval = setInterval(() => {
            if (messageIndex < statusMessages.length) {
                statusElement.text(statusMessages[messageIndex]);
                messageIndex++;
            }
        }, 800);
        
        // Animate progress bar in stages
        setTimeout(() => {
            loader.find('.progress-fill').css('width', '20%');
        }, 500);
        
        setTimeout(() => {
            loader.find('.progress-fill').css('width', '40%');
        }, 1500);
        
        setTimeout(() => {
            loader.find('.progress-fill').css('width', '60%');
        }, 2500);
        
        setTimeout(() => {
            loader.find('.progress-fill').css('width', '80%');
        }, 3500);
        
        setTimeout(() => {
            loader.find('.progress-fill').css('width', '95%');
        }, 4500);
        
        // Store the interval ID for cleanup
        loader.data('statusInterval', statusInterval);
    }

    function hideExportLoadingAnimation() {
        const loader = $('#exportLoader');
        if (loader.length) {
            // Clear the status interval
            const statusInterval = loader.data('statusInterval');
            if (statusInterval) {
                clearInterval(statusInterval);
            }
            
            // Complete the progress bar
            loader.find('.progress-fill').css('width', '100%');
            loader.find('#exportStatus').text('Export complete!');
            
            // Wait a moment to show completion, then fade out
            setTimeout(() => {
                loader.fadeOut(500, function() {
                    $(this).remove();
                });
            }, 800);
        }
    }function exportAsPNG() {
       
        try {
            // Show loading animation
            showExportLoadingAnimation();
            
            // Get only the current visible chart elements
            const chartClone = getCurrentVisibleChart();
            
            // Get the actual chart dimensions
            const chartRect = orgChart[0].getBoundingClientRect();
            
            // Create a cleaner container with proper sizing
            const exportContainer = $('<div>').css({
                'position': 'absolute',
                'top': '-99999px',
                'left': '-99999px',
                'background': 'white',
                'padding': '40px',
                'box-sizing': 'border-box',
                'display': 'block',
                'width': 'auto',
                'height': 'auto',
                'min-width': '1200px',
                'min-height': '800px'
            });
            
            // Style the clone for better export
            chartClone.css({
                'position': 'relative',
                'transform': 'scale(1)', // Use normal scale for better quality
                'transform-origin': 'top left',
                'left': '0px',
                'top': '0px',
                'margin': '0',
                'width': 'auto',
                'height': 'auto'
            });
            
            exportContainer.append(chartClone);
            $('body').append(exportContainer);
            
            // Force layout calculation
            exportContainer[0].offsetHeight;
              // Load all images before export
            loadAllImagesForExport(exportContainer).then(() => {
                // Wait for the DOM to settle then capture (minimum 5 seconds for animation)
                setTimeout(() => {
                    html2canvas(exportContainer[0], {
                        backgroundColor: '#ffffff',
                        scale: 2, // Reduced scale for better performance and quality balance
                        useCORS: true,
                        allowTaint: false,
                        logging: false,
                        scrollX: 0,
                        scrollY: 0,
                        windowWidth: exportContainer[0].scrollWidth,
                        windowHeight: exportContainer[0].scrollHeight,
                        imageTimeout: 5000,
                        onclone: function(clonedDoc) {
                            // Ensure all images are loaded in the clone
                            const clonedImages = clonedDoc.querySelectorAll('img[data-src]');
                            clonedImages.forEach(img => {
                                if (img.dataset.src && !img.src.includes('data:image')) {
                                    img.src = img.dataset.src;
                                }
                            });
                        }
                    }).then(canvas => {
                        // Hide loading animation
                        hideExportLoadingAnimation();
                        
                        // Download as PNG
                        const link = document.createElement('a');
                        link.download = `${organization_name || "Organization Chart"}.png`;
                        link.href = canvas.toDataURL('image/png', 0.95);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        sessionStorage.setItem('skipPreloader', 'true'); 
                        // Cleanup
                        exportContainer.remove();
                    }).catch(error => {
                        console.error('Error generating PNG:', error);
                        hideExportLoadingAnimation();
                        alert('Error generating PNG. Please try again.');
                        exportContainer.remove();
                    });
                }, 5000); // Minimum 5.3 seconds for full animation experience
            }).catch(error => {
                console.error('Error loading images for export:', error);
                hideExportLoadingAnimation();
                alert('Error loading images for export. Please try again.');
                exportContainer.remove();
            });
            
        } catch (error) {
            console.error('Error in PNG export:', error);
            hideExportLoadingAnimation();
            alert('Error generating PNG. Please try again.');
        }
    }    function exportAsPDF() {
        try {
            // Show loading animation
            showExportLoadingAnimation();
            
            // Get only the current visible chart elements
            const chartClone = getCurrentVisibleChart();
            
            // Create a cleaner container similar to PNG export
            const exportContainer = $('<div>').css({
                'position': 'absolute',
                'top': '-99999px',
                'left': '-99999px',
                'background': 'white',
                'padding': '30px',
                'box-sizing': 'border-box',
                'display': 'block',
                'width': 'auto',
                'height': 'auto',
                'min-width': '1000px',
                'min-height': '700px'
            });
            
            // Style the clone for export
            chartClone.css({
                'position': 'relative',
                'transform': 'scale(1)',
                'transform-origin': 'top left',
                'left': '0px',
                'top': '0px',
                'margin': '0',
                'width': 'auto',
                'height': 'auto'
            });
            
            exportContainer.append(chartClone);
            $('body').append(exportContainer);
            
            // Force layout calculation
            exportContainer[0].offsetHeight;
              // Load all images before export
            loadAllImagesForExport(exportContainer).then(() => {
                // Use html2canvas to capture the chart with higher quality (minimum 5 seconds for animation)
                setTimeout(() => {
                    html2canvas(exportContainer[0], {
                        backgroundColor: '#ffffff',
                        scale: 2, // 3x higher quality as requested (1.5 * 3)
                        useCORS: true,
                        allowTaint: false,
                        logging: false,
                        scrollX: 0,
                        scrollY: 0,
                        windowWidth: exportContainer[0].scrollWidth,
                        windowHeight: exportContainer[0].scrollHeight,
                        imageTimeout: 5000,
                        onclone: function(clonedDoc) {
                            // Ensure all images are loaded in the clone
                            const clonedImages = clonedDoc.querySelectorAll('img[data-src]');
                            clonedImages.forEach(img => {
                                if (img.dataset.src && !img.src.includes('data:image')) {
                                    img.src = img.dataset.src;
                                }
                            });
                        }
                    }).then(canvas => {
                const imgData = canvas.toDataURL('image/png', 0.95);
                const { jsPDF } = window.jspdf;
                
                // Get original image dimensions
                const originalWidth = canvas.width;
                const originalHeight = canvas.height;
                
                // Calculate scale factor to fit within reasonable PDF dimensions
                // Maximum content size in mm (considering A3 as max reasonable size)
                const maxContentWidth = 380; // A3 width minus margins
                const maxContentHeight = 540; // A3 height minus margins
                
                // Convert pixels to mm for initial calculation
                let imgWidthMm = originalWidth * 0.264583;
                let imgHeightMm = originalHeight * 0.264583;
                
                // Scale down if too large
                const scaleX = imgWidthMm > maxContentWidth ? maxContentWidth / imgWidthMm : 1;
                const scaleY = imgHeightMm > maxContentHeight ? maxContentHeight / imgHeightMm : 1;
                const scale = Math.min(scaleX, scaleY);
                
                // Apply scaling
                imgWidthMm = imgWidthMm * scale;
                imgHeightMm = imgHeightMm * scale;
                
                // Set margins and calculate page size
                const margin = 20;
                const headerHeight = 35;
                const footerHeight = 20;
                
                const pageWidth = Math.max(imgWidthMm + (margin * 2), 210); // Minimum A4 width
                const pageHeight = Math.max(imgHeightMm + headerHeight + footerHeight + (margin * 2), 297); // Minimum A4 height
                
                // Choose orientation based on aspect ratio
                const orientation = pageWidth >= pageHeight ? 'l' : 'p';
                
                // Create PDF with custom page size
                const pdf = new jsPDF({
                    orientation: orientation,
                    unit: 'mm',
                    format: [pageWidth, pageHeight]                });
            
            // Enhanced header design
            const currentDate = new Date().toLocaleDateString();
              // Add blue header background
            pdf.setFillColor(79, 195, 247); // Blue theme color
            pdf.rect(0, 0, pageWidth, headerHeight, 'F');
            
            // Get organization name
            const orgNode = orgData.nodes.find(node => node.node_type === 'Organization');
            const organizationName = (orgNode && orgNode.org_name) ? orgNode.org_name : 'Organization Chart';
            
            // Add white text for header
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ORGANIZATION CHART', pageWidth / 2, 15, { align: 'center' });
            
            // Add organization name instead of platform info
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'normal');
            pdf.text(organizationName, pageWidth / 2, 25, { align: 'center' });
            
            // Add logo placeholder (you can replace this with actual logo)
            pdf.setFillColor(255, 255, 255);
            pdf.circle(25, 20, 8, 'F');
            pdf.setTextColor(79, 195, 247);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('IO', 25, 23, { align: 'center' });
              // Add separator line
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.line(10, headerHeight + 5, pageWidth - 10, headerHeight + 5);
            
            // Calculate image position - place image in the middle with margins
            const availableHeight = pageHeight - headerHeight - footerHeight - 20;
            const availableWidth = pageWidth - (margin * 2);
            
            // Use the actual image dimensions in mm, scaled to fit within available space
            let finalImgWidth = imgWidthMm;
            let finalImgHeight = imgHeightMm;
            
            // Scale down if image is larger than available space
            if (finalImgWidth > availableWidth || finalImgHeight > availableHeight) {
                const scaleX = availableWidth / finalImgWidth;
                const scaleY = availableHeight / finalImgHeight;
                const scale = Math.min(scaleX, scaleY);
                
                finalImgWidth *= scale;
                finalImgHeight *= scale;
            }
            
            // Center the image
            const x = (pageWidth - finalImgWidth) / 2;
            const y = headerHeight + 10 + ((availableHeight - finalImgHeight) / 2);
            
            // Add subtle border around image
            pdf.setDrawColor(220, 220, 220);
            pdf.setLineWidth(0.3);
            pdf.rect(x - 2, y - 2, finalImgWidth + 4, finalImgHeight + 4);
            
            pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
            
            // Enhanced footer design
            const footerY = pageHeight - footerHeight;
            
            // Add footer background
            pdf.setFillColor(245, 245, 245);
            pdf.rect(0, footerY, pageWidth, footerHeight, 'F');
            
            // Add footer border
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.line(0, footerY, pageWidth, footerY);
              // Footer content
            pdf.setTextColor(80, 80, 80);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            
            // Left side - export date only (removed node count)
            const exportDate = new Date();
            const exportDateStr = exportDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const exportTimeStr = exportDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'UTC'
            });
            pdf.text(`Export Date: ${exportDateStr} ${exportTimeStr} UTC+0`, 10, footerY + 11);
            
            // Right side - branding
            pdf.setFont('helvetica', 'bold');
            pdf.text('Digitally Generated by InsideOrgs', pageWidth - 10, footerY + 8, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            pdf.text('insideorgs.sphurti.net', pageWidth - 10, footerY + 14, { align: 'right' });
            
            // Center - page info
            pdf.setFont('helvetica', 'italic');
            pdf.text('Confidential & Proprietary', pageWidth / 2, footerY + 11, { align: 'center' });
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
            // Download the PDF
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${organization_name || 'Organization Chart'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Hide loading animation
            sessionStorage.setItem('skipPreloader', 'true'); 
            hideExportLoadingAnimation();
            
            // Cleanup
            exportContainer.remove();
            }).catch(error => {
                hideExportLoadingAnimation();                
                alert('Error generating PDF. Please try again.');
                exportContainer.remove();
            });
                }, 5300); // Minimum 5.3 seconds for full animation experience
            }).catch(error => {
                console.error('Error loading images for export:', error);
                hideExportLoadingAnimation();
                alert('Error loading images for export. Please try again.');
                exportContainer.remove();
            });
        } catch (error) {
            console.error('Error in PDF export:', error);
            hideExportLoadingAnimation();
            alert('Error generating PDF. Please try again.');
        }
    }

    function exportAsCSV() {
        try {
            // Show loading animation
            showExportLoadingAnimation();
            
            // Get only current visible data
            const visibleData = getCurrentVisibleData();
            const csvData = [];
            
          
            
            // Base headers and row keys (exclude dynamic fields)
            const baseHeaders = [
                'Organization Name', 'Domain', 'Employee Range', 'Department', 'Industry',
                'Solution Offered', 'Primary Address', 'City/Town', 'State/Province',
                'Country/Region', 'Postal Code', 'Seniority Level', 'Job Function',
                'Full Name', 'Designation', 'Linkedin Profile', 'Public Profile',
                'Email Address', 'Boardline Number'
            ];

            const baseRowFields = [
                'organization_name', 'domain', 'employee_range', 'department', 'industry',
                'solution_offered', 'primary_address', 'city', 'state',
                'country', 'postal_code', 'seniority_level', 'job_function',
                'name', 'designation', 'linkedin', 'other',
                'email_id', 'boardline_number'
            ];

            // Flags to track if optional headers should be added
            let includePersonalNumber = false;
            let customFieldsCount = 0;

            // First pass to determine headers
            visibleData.forEach(item => {
                if (item.node_type == 'Person'){
                if (item.personal_number) includePersonalNumber = true;

                for (let i = 1; i <= 4; i++) {
                    const hasAnyCustomValue =
                        item[`custom_heading${i}`] || item[`custom_content${i}`] ||
                        item[`custom_link${i}`] || item[`custom_date${i}`];
                    if (hasAnyCustomValue && i > customFieldsCount) {
                        customFieldsCount = i;
                    }
                }
            }
            });

            // Construct header row
            const headers = [...baseHeaders];
            if (includePersonalNumber) headers.push('Personal Number');

            for (let i = 1; i <= customFieldsCount; i++) {
                headers.push(`Custom Heading ${i}`, `Custom Content ${i}`, `Custom Link ${i}`, `Custom Date ${i}`);
            }
            csvData.push(headers);

            // Now build each row
            visibleData.forEach(item => {
                if (item.node_type == 'Person'){
                const row = baseRowFields.map(key => item[key] || '');

                if (includePersonalNumber) {
                    row.push(item.personal_number || '');
                }

                for (let i = 1; i <= customFieldsCount; i++) {
                    row.push(
                        item[`custom_heading${i}`] || '',
                        item[`custom_content${i}`] || '',
                        item[`custom_link${i}`] || '',
                        item[`custom_date${i}`] || ''
                    );
                }

                csvData.push(row);
            }
            });
            // Convert to CSV string
            const csvString = csvData.map(row => 
                row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            sessionStorage.setItem('skipPreloader', 'true'); 
            // Simulate processing time for animation
            setTimeout(() => {
                downloadFile(csvString, `${organization_name || 'Organization Chart'}.csv`, 'text/csv');
                hideExportLoadingAnimation();
            }, 1000);
            
        } catch (error) {
            console.error('Error generating CSV:', error);
            hideExportLoadingAnimation();
            alert('Error generating CSV. Please try again.');
        }
    }    function exportAsExcel() {
        try {
            // Show loading animation
            showExportLoadingAnimation();
            
            // Get only current visible data
            const visibleData = getCurrentVisibleData();
            
            const wsData = [];

            const baseHeaders = [
                'Organization Name', 'Domain', 'Employee Range', 'Department', 'Industry',
                'Solution Offered', 'Primary Address', 'City/Town', 'State/Province',
                'Country/Region', 'Postal Code', 'Seniority Level', 'Job Function',
                'Full Name', 'Designation', 'Linkedin Profile', 'Public Profile',
                'Email Address', 'Boardline Number'
            ];

            const baseRowFields = [
                'organization_name', 'domain', 'employee_range', 'department', 'industry',
                'solution_offered', 'primary_address', 'city', 'state',
                'country', 'postal_code', 'seniority_level', 'job_function',
                'name', 'designation', 'linkedin', 'other',
                'email_id', 'boardline_number'
            ];

            let includePersonalNumber = false;
            let customFieldsCount = 0;

            // Determine if personal number and custom fields exist
            visibleData.forEach(item => {
                if (item.node_type === 'Person') {
                    if (item.personal_number) includePersonalNumber = true;

                    for (let i = 1; i <= 4; i++) {
                        const hasAnyCustomValue =
                            item[`custom_heading${i}`] || item[`custom_content${i}`] ||
                            item[`custom_link${i}`] || item[`custom_date${i}`];
                        if (hasAnyCustomValue && i > customFieldsCount) {
                            customFieldsCount = i;
                        }
                    }
                }
            });

            // Build header row
            const headers = [...baseHeaders];
            if (includePersonalNumber) headers.push('Personal Number');
            for (let i = 1; i <= customFieldsCount; i++) {
                headers.push(`Custom Heading ${i}`, `Custom Content ${i}`, `Custom Link ${i}`, `Custom Date ${i}`);
            }
            wsData.push(headers);

            // Build data rows
            visibleData.forEach(item => {
                if (item.node_type === 'Person') {
                    const row = baseRowFields.map(key => item[key] || '');

                    if (includePersonalNumber) {
                        row.push(item.personal_number || '');
                    }

                    for (let i = 1; i <= customFieldsCount; i++) {
                        row.push(
                            item[`custom_heading${i}`] || '',
                            item[`custom_content${i}`] || '',
                            item[`custom_link${i}`] || '',
                            item[`custom_date${i}`] || ''
                        );
                    }

                    wsData.push(row);
                }
            });

            // Create Excel sheet and export
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Optional: auto column width
            ws['!cols'] = new Array(wsData[0].length).fill({ wch: 25 });

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, `${ organization_name || 'Organization Chart'}`);
              // Simulate processing time for animation (minimum 5 seconds)
            setTimeout(() => {
                // Save file
                XLSX.writeFile(wb, `${organization_name || 'Organization Chart'}.xlsx`);
                sessionStorage.setItem('skipPreloader', 'true'); 
                hideExportLoadingAnimation();
            }, 5300);
            
        } catch (error) {
            console.error('Error generating Excel:', error);
            hideExportLoadingAnimation();
            alert('Error generating Excel. Please try again.');
        }
    }
    
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }    // Zoom utility functions for expand/collapse all
    function zoomToFitAll() {
        const containerWidth = chartContainer.width();
        const containerHeight = chartContainer.height();
        
        // Get the actual size of the org chart including all visible elements
        const chartRect = orgChart[0].getBoundingClientRect();
        const chartWidth = chartRect.width / currentZoom; // Get actual width without current zoom
        const chartHeight = chartRect.height / currentZoom; // Get actual height without current zoom
          // Calculate zoom to fit all content with more zoom out capability
        const zoomX = (containerWidth * 0.8) / chartWidth;  // Reduced from 0.9 to 0.8 for more zoom out
        const zoomY = (containerHeight * 0.8) / chartHeight;  // Reduced from 0.9 to 0.8 for more zoom out
        const targetZoom = Math.min(zoomX, zoomY, maxZoom);
        // Add vertical offset (e.g., shift upward by 40px)
        const verticalOffset = 50;

        // Smoothly animate to the new zoom and center position
        animateZoomAndPosition(
            targetZoom,
            (containerWidth - chartWidth * targetZoom) / 2, // X
            (containerHeight - chartHeight * targetZoom) / 2 - verticalOffset // Y with upward shift
        );
    }
      // Function to center and fit chart specifically for filtering
    function centerChartOnFiltering() {
        const containerWidth = chartContainer.width();
        const containerHeight = chartContainer.height();
        
        // Get all visible nodes (not white dots or hidden)
        const $visibleNodes = $('.org-card:visible, .person-card:visible, .dept-card:visible').not('.filtered-dot');
        
        if ($visibleNodes.length === 0) {
            return;
        }
        
        // Use the same approach as zoomToFitAll - get the actual chart dimensions
        const chartRect = orgChart[0].getBoundingClientRect();
        const chartWidth = chartRect.width / currentZoom; // Get actual width without current zoom
        const chartHeight = chartRect.height / currentZoom; // Get actual height without current zoom
        
        // Calculate zoom to fit all content (similar to zoomToFitAll)
        const zoomX = (containerWidth * 0.8) / chartWidth;
        const zoomY = (containerHeight * 0.8) / chartHeight;
        const targetZoom = Math.min(zoomX, zoomY, maxZoom);
        
        // Center the chart content in the container
        const targetX = (containerWidth - chartWidth * targetZoom) / 2;
        const targetY = (containerHeight - chartHeight * targetZoom) / 2;
        
        
        
        // Animate smoothly to the new position and zoom
        animateZoomAndPosition(targetZoom, targetX, targetY);
    }
      function resetZoomAndPosition() {
        // Reset to original zoom (1.0) and center position
        const containerWidth = chartContainer.width();
        const containerHeight = chartContainer.height();
        
        // Reset zoom to 1.0 first
        currentZoom = 1.0;
        
        // Get the actual root organization card
        const orgCard = $('.org-level.level-1 .org-card, .org-level.level-1 .person-card').first();
        
        if (orgCard.length > 0) {
            // Get the card dimensions
            const cardWidth = orgCard.outerWidth();
            const cardHeight = orgCard.outerHeight();
            
            
            // Calculate center position for the card
            const centerX = (containerWidth - cardWidth) / 2;
            const centerY = (containerHeight - cardHeight) / 2;
            
            
            // Apply the transformation to center the chart
            orgChart.css({
                'transform': `scale(${currentZoom})`,
                'left': centerX + 'px',
                'top': centerY + 'px'
            });
            
            // Update current position variables
            currentX = centerX;
            currentY = centerY;
        } else {
            // Fallback: center the entire org chart
            const chartWidth = orgChart.outerWidth();
            const chartHeight = orgChart.outerHeight();
            
            const centerX = (containerWidth - chartWidth) / 2;
            const centerY = (containerHeight - chartHeight) / 2;
            
            orgChart.css({
                'transform': `scale(${currentZoom})`,
                'left': centerX + 'px',
                'top': centerY + 'px'
            });
            
            currentX = centerX;
            currentY = centerY;
        }
    }

    function animateZoomAndPosition(targetZoom, targetX, targetY) {
        // Animate zoom and position changes smoothly
        const startZoom = currentZoom;
        const startX = currentX;
        const startY = currentY;
        const duration = 500; // 500ms animation
        const startTime = Date.now();
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate values
            currentZoom = startZoom + (targetZoom - startZoom) * easeOut;
            currentX = startX + (targetX - startX) * easeOut;
            currentY = startY + (targetY - startY) * easeOut;
              // Apply the transformation
            orgChart.css({
                'transform': `scale(${currentZoom})`,
                'left': currentX + 'px',
                'top': currentY + 'px'
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation completed, recalculate connectors
                setTimeout(() => {
                    performConnectorRecalculation();
                }, 50);
            }
        }
        
        requestAnimationFrame(animate);
    }

    function checkAndAddClassToNodeContainers() {
    $('.node-container').each(function() {
      const $nodeContainer = $(this);
   const $relevantChildren = $nodeContainer.children()
                                            .not('.parent-connector') // Explicitly ignore parent-connector
                                            .filter('.org-card, .person-card'); // Count only org-card or person-card

      if ($relevantChildren.length > 1) {
        $nodeContainer.addClass('node-with-siblings'); // Custom class to add
      } else {
        $nodeContainer.removeClass('node-with-siblings'); // Optional: remove if no longer applicable
      }
    });
  }

  // Call the function directly
  checkAndAddClassToNodeContainers();    
  function expandNode(nodeId, skipAutoZoom = false) {
        const $childrenGroup = $(`.children-group[data-parent="${nodeId}"]`);
        const $childConnector = $childrenGroup.siblings('.child-connector');
        const $expandBtn = $(`.expand-btn[data-parent="${nodeId}"]`);
        const $collapseBtn = $(`.collapse-btn[data-parent="${nodeId}"]`);
          if ($childrenGroup.length > 0) {
            // Show the children with smooth slide down animation
            $childrenGroup.slideDown(400, function() {
                // After animation completes, recalculate connectors for dynamic layout
                performConnectorRecalculation();
            });
            
            // Show child connector
            $childConnector.slideDown(400);
            
            // Toggle buttons
            $expandBtn.hide();
            $collapseBtn.show();            
            // Remove collapsed class
            $childrenGroup.removeClass('collapsed');
            $childConnector.removeClass('collapsed');
            
            // Trigger lazy loading for newly visible images
            setTimeout(() => {
                observeLazyImages();
            }, 50);
        }
        
        // Only auto-zoom if not called from search navigation
        if (!skipAutoZoom) {
            setTimeout(() => {
                zoomToFitAll();
            }, 100);
        }
    }

    function collapseNode(nodeId) {
        const $childrenGroup = $(`.children-group[data-parent="${nodeId}"]`);        const $childConnector = $childrenGroup.siblings('.child-connector');
        const $expandBtn = $(`.expand-btn[data-parent="${nodeId}"]`);
        const $collapseBtn = $(`.collapse-btn[data-parent="${nodeId}"]`);
        
        if ($childrenGroup.length > 0) {  
                      // Hide the children with smooth slide up animation
            $childrenGroup.slideUp(400, function() {
                // After animation completes, recalculate connectors for dynamic layout
                performConnectorRecalculation();
            });
            
            // Hide child connector
            $childConnector.slideUp(400);
            
            // Toggle buttons
            $collapseBtn.hide();
            $expandBtn.show();
              // Add collapsed class
            $childrenGroup.addClass('collapsed');            
            $childConnector.addClass('collapsed');   
             }
             zoomToFitAll();
    }    

    // Expand All function - expands all nodes and fits chart to container
    function expandAll() {
        // Get all nodes that have children and can be expanded
        const $expandableNodes = $('.expand-btn');
        
        if ($expandableNodes.length === 0) {
            // If no nodes to expand, just zoom to fit current view
            zoomToFitAll();
            return;
        }
        
        let expandedCount = 0;
        const totalToExpand = $expandableNodes.length;
        
        // Expand each node without individual animations for speed
        $expandableNodes.each(function() {
            const nodeId = $(this).data('parent');
            const $childrenGroup = $(`.children-group[data-parent="${nodeId}"]`);
            const $childConnector = $childrenGroup.siblings('.child-connector');
            const $expandBtn = $(this);
            const $collapseBtn = $(`.collapse-btn[data-parent="${nodeId}"]`);
            
            if ($childrenGroup.length > 0) {
                // Show children instantly without animation for speed
                $childrenGroup.show().removeClass('collapsed');
                $childConnector.show().removeClass('collapsed');
                
                // Toggle buttons
                $expandBtn.hide();
                $collapseBtn.show();
                
                expandedCount++;
            }
        });
          // After all expansions, recalculate connectors and zoom to fit
        setTimeout(() => {
            performConnectorRecalculation();
            // Wait a bit more for layout to settle, then zoom to fit all
            setTimeout(() => {
                zoomToFitAll();
                // Ensure tracking variables are synced after zoom
                setTimeout(() => {
                }, 100);
            }, 100);
        }, 50);
        
    }
      // Collapse All function - collapses all nodes and centers on root
    function collapseAll() {
        // Get all nodes that are currently expanded (have visible collapse buttons)
        const $collapsibleNodes = $('.collapse-btn:visible');
        
        if ($collapsibleNodes.length === 0) {
            // If no nodes to collapse, just reset zoom and position to center root
            centerOnRootNode();
            return;
        }
        
        let collapsedCount = 0;
        
        // Collapse each node without individual animations for speed
        $collapsibleNodes.each(function() {
            const nodeId = $(this).data('parent');
            const $childrenGroup = $(`.children-group[data-parent="${nodeId}"]`);
            const $childConnector = $childrenGroup.siblings('.child-connector');
            const $expandBtn = $(`.expand-btn[data-parent="${nodeId}"]`);
            const $collapseBtn = $(this);
            
            if ($childrenGroup.length > 0) {
                // Hide children instantly without animation for speed
                $childrenGroup.hide().addClass('collapsed');
                $childConnector.hide().addClass('collapsed');
                
                // Toggle buttons
                $collapseBtn.hide();
                $expandBtn.show();
                
                collapsedCount++;
            }
        });
          // After all collapses, recalculate connectors and center on root
        setTimeout(() => {
            performConnectorRecalculation();
            // Wait longer for layout to fully settle, then center on root
            setTimeout(() => {
                centerOnRootNode();
                // Ensure tracking variables are synced after centering
                setTimeout(() => {
                }, 100);
            }, 200);
        }, 100);
        
    }    // New function specifically for centering on the root node
    function centerOnRootNode() {
        const containerWidth = chartContainer.width();
        const containerHeight = chartContainer.height();
        
        
        // Reset zoom and position variables
        const targetZoom = 1.0;
        const targetX = 0;
        const targetY = containerHeight * 0.3; // 30% of viewport height
        
        
        // Use animateZoomAndPosition to properly update tracking variables
        animateZoomAndPosition(targetZoom, targetX, targetY);
    }

    // Debounce timer for connector recalculation

    function performConnectorRecalculation() {
        // Recalculate horizontal sibling connectors for visible nodes only
        recalculateHorizontalConnectors();
        
        // Recalculate vertical connectors
        // recalculateVerticalConnectors();
        
        // Recalculate drop connectors
        recalculateDropConnectors();
    }

    function recalculateHorizontalConnectors() {
        $('.level-nodes').each(function() {
            const $levelNodes = $(this);
            // Only consider visible node containers
            const $nodeContainers = $levelNodes.find('> .node-container:visible');
            if ($nodeContainers.length > 1) {
                const $siblingConnector = $levelNodes.find('> .sibling-connector');

                if ($siblingConnector.length > 0) {
                    const nodeRects = [];                    $nodeContainers.each(function () {
                    const rect = getZoomAdjustedRect(this);
                    nodeRects.push({
                        left: rect.left,
                        center: rect.left + rect.width / 2,
                        width: rect.width
                    });
                });
                    
                      if (nodeRects.length > 1) {
                    const firstCenter = nodeRects[0].center;
                    const lastCenter = nodeRects[nodeRects.length - 1].center;
                    const connectorWidth = Math.abs(lastCenter - firstCenter);                    const levelRect = getZoomAdjustedRect($levelNodes[0]);
                    const relativeLeft = Math.min(firstCenter, lastCenter) - levelRect.left;

                    // Set connector with correct width and position (relative to .level-nodes)
                    $siblingConnector.css({
                        left: relativeLeft + 'px',
                        width: connectorWidth + 'px',
                        display: 'block'
                    });
                    } else {
                        // Hide connector if only one or no visible nodes
                        $siblingConnector.hide();
                    }
                } else {
                    // Hide connector if no visible nodes
                    $siblingConnector.hide();
                }
            }
        });
    }


    function recalculateVerticalConnectors() {
        // Recalculate parent connectors
        $('.parent-connector').each(function() {
            const $connector = $(this);
            const $nodeContainer = $connector.closest('.node-container');
            const $parentLevel = $nodeContainer.closest('.org-level').prev('.org-level');
            
            if ($parentLevel.length > 0 && $nodeContainer.is(':visible')) {
                $connector.css({
                    'margin': '0 auto',
                    'display': 'block'
                });
            } else {
                $connector.hide();
            }
        });

        // Recalculate child connectors
        $('.child-connector').each(function() {
            const $connector = $(this);
            const $nodeContainer = $connector.closest('.node-container');
            const $childrenGroup = $nodeContainer.find('.children-group');
            
            // Check if children group is visible and has visible children
            if ($childrenGroup.length > 0 && 
                $childrenGroup.is(':visible') && 
                $childrenGroup.children(':visible').length > 0) {
                $connector.css({
                    'margin': '0 auto',
                    'display': 'block'
                });
            } else {
                $connector.hide();
            }
        });
    }    function recalculateDropConnectors() {
        $('.sibling-connector').each(function() {
            const $siblingConnector = $(this);
            const $levelNodes = $siblingConnector.parent('.level-nodes');
            // Only consider visible node containers
            const $nodeContainers = $levelNodes.find('> .node-container:visible');
            
            // Remove existing drop connectors
            $siblingConnector.find('.drop-connector').remove();
            
            if ($nodeContainers.length > 1 && $siblingConnector.is(':visible')) {
                $nodeContainers.each(function() {                    const $nodeContainer = $(this);
                    if ($nodeContainer.is(':visible')) {
                        const $node = $nodeContainer.find('.org-card, .person-card').first();
                        
                        if ($node.length > 0) {
                            // Calculate position for drop connector using zoom-aware function
                            const nodeRect = getZoomAdjustedRect($node[0]);
                            const siblingRect = getZoomAdjustedRect($siblingConnector[0]);
                            const nodeCenter = nodeRect.left + (nodeRect.width / 2);
                            const relativeLeft = nodeCenter - siblingRect.left;
                            
                            // Create drop connector
                            const $dropConnector = $('<div class="drop-connector"></div>');
                            $dropConnector.css({
                                'position': 'absolute',
                                'left': relativeLeft + 'px',
                                'top': '0px',
                                'width': '2px',
                                'height': '40px',
                                'background': '#aeaeae',
                                'z-index': '2',
                                'transform': 'translateX(-50%)'
                            });
                            
                            $siblingConnector.append($dropConnector);
                        }
                    }
                });            }
        });
    }

    // function initializeConnectorMonitoring() {
    //     // Set up a mutation observer to watch for visibility changes
    //     const chartContainer = document.querySelector('.chart-container');
    //     if (chartContainer && window.MutationObserver) {
    //         const observer = new MutationObserver(function(mutations) {
    //             let shouldRecalculate = false;
                
    //             mutations.forEach(function(mutation) {
    //                 // Check for attribute changes (like style changes that affect visibility)
    //                 if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
    //                     const target = mutation.target;
    //                     if (target.classList.contains('children-group') || 
    //                         target.classList.contains('child-connector') ||
    //                         target.classList.contains('node-container')) {
    //                         shouldRecalculate = true;
    //                     }
    //                 }
                    
    //                 // Check for added/removed nodes
    //                 if (mutation.type === 'childList') {
    //                     mutation.addedNodes.forEach(function(node) {
    //                         if (node.nodeType === 1 && 
    //                             (node.classList.contains('children-group') || 
    //                              node.classList.contains('node-container'))) {
    //                             shouldRecalculate = true;
    //                         }
    //                     });
                        
    //                     mutation.removedNodes.forEach(function(node) {
    //                         if (node.nodeType === 1 && 
    //                             (node.classList.contains('children-group') || 
    //                              node.classList.contains('node-container'))) {
    //                             shouldRecalculate = true;
    //                         }
    //                     });
    //                 }
    //             });
                
    //             if (shouldRecalculate) {
    //                 recalculateConnectors();
    //             }
    //         });
            
    //         // Start observing
    //         observer.observe(chartContainer, {
    //             attributes: true,
    //             attributeFilter: ['style', 'class'],
    //             childList: true,
    //             subtree: true
    //         });
    //     }    // }    // Text expansion popup functionality
    function initTextExpansion() {
        // Use MutationObserver for better performance (modern approach)
        if (window.MutationObserver) {
            const observer = new MutationObserver(function(mutations) {
                let shouldCheck = false;
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && 
                        mutation.target.closest('.profile-details')) {
                        shouldCheck = true;
                    }
                });
                if (shouldCheck) {
                    setTimeout(checkTruncatedElements, 100);
                }
            });
            
            // Observe changes in profile details area
            const profileContainer = document.querySelector('#rightPanel');
            if (profileContainer) {
                observer.observe(profileContainer, {
                    childList: true,
                    subtree: true
                });
            }
        }
          $(document).on('click', '.truncate-text.expandable, .expand-icon', function(e) {
            const $this = $(this);
            let $truncateText, fullText, label;
            
            if ($this.hasClass('expand-icon')) {
                // Clicked on the expand icon
                const $detailItem = $this.closest('.detail-item');
                $truncateText = $detailItem.find('.truncate-text.expandable');
                fullText = $truncateText.attr('data-full-text') || $truncateText.attr('title');
                label = $detailItem.find('.detail-label').clone().find('.expand-icon').remove().end().text().trim();
            } else {
                // Clicked on the truncated text
                $truncateText = $this;
                fullText = $truncateText.attr('data-full-text') || $truncateText.attr('title');
                label = $truncateText.closest('.detail-item').find('.detail-label').clone().find('.expand-icon').remove().end().text().trim();
            }
            
            // Show popup for expandable text
            if (fullText && fullText !== 'N/A' && $truncateText.hasClass('expandable')) {
                e.preventDefault();
                e.stopPropagation();
                showTextPopup(label, fullText);
            }
        });
    }
      // Function to check which elements are actually truncated
    function checkTruncatedElements() {
        $('.truncate-text').each(function() {
            const $this = $(this);
            const element = this;
            const fullText = $this.attr('title') || $this.text();
            const $detailItem = $this.closest('.detail-item');
            const $detailLabel = $detailItem.find('.detail-label');
            
            // Skip if no meaningful content
            if (!fullText || fullText === 'N/A' || fullText.length < 50) {
                $this.removeClass('expandable');
                $detailLabel.find('.expand-icon').remove();
                return;
            }
            const isOverflowing = element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth ;
            const isTooLong = fullText.trim().length > 80;
            // Store full text for later use
            $this.attr('data-full-text', fullText);
            
            // Check if element is actually truncated by comparing scroll height
            if (isOverflowing || isTooLong) {
                $this.addClass('expandable');
                
                // Add visual indicator that text is truncated
                // if (!$this.find('.ellipsis-indicator').length) {

                //     const $copyIcon = $this.find('.copy-icon'); // Adjust selector if needed

                // if ($copyIcon.length) {
                //     $('<span class="ellipsis-indicator">...</span>').insertBefore($copyIcon);
                // } else {
                //     $this.append('<span class="ellipsis-indicator">...</span>'); // fallback
                // }
                // }
                
                // Add expand icon to the label if not already present
                if (!$detailLabel.find('.expand-icon').length) {
                    $detailLabel.append(`
                        <span class="expand-icon" title="Click to expand full text">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
                            </svg>
                        </span>
                    `);
                }
            } else {
                $this.removeClass('expandable');
                $this.find('.ellipsis-indicator').remove();
                $detailLabel.find('.expand-icon').remove();
            }
        });
    }
    
    function showTextPopup(title, content) {
        // Remove existing popup
        $('.text-popup-overlay, .text-popup').remove();
        
        const popupHtml = `
            <div class="text-popup-overlay"></div>
            <div class="text-popup">
                <div class="text-popup-header">
                    <div class="text-popup-title">${title}</div>
                    <button class="text-popup-close">&times;</button>
                </div>
                <div class="text-popup-content">${content}</div>
            </div>
        `;
        
        $('body').append(popupHtml);
        
        // Close popup handlers
        $('.text-popup-overlay, .text-popup-close').click(function() {
            $('.text-popup-overlay, .text-popup').fadeOut(300, function() {
                $(this).remove();
            });
        });
        
        // Prevent popup from closing when clicking inside
        $('.text-popup').click(function(e) {
            e.stopPropagation();
        });
        
        // ESC key to close
        $(document).on('keydown.textpopup', function(e) {
            if (e.keyCode === 27) {
                $('.text-popup-overlay, .text-popup').fadeOut(300, function() {
                    $(this).remove();
                });
                $(document).off('keydown.textpopup');
            }
        });
    }

    // Initialize text expansion functionality
    initTextExpansion();


    
// Mobile device detection and overlay message
function showMobileOverlayIfNeeded() {
    var isMobile = window.innerWidth < 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        if (!document.getElementById('mobileOverlay')) {
            var overlay = document.createElement('div');
            overlay.id = 'mobileOverlay';
            overlay.style = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                width: 100vw; height: 100vh;
                background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
                backdrop-filter: blur(12px);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
            `;
            overlay.innerHTML = `
                <div style="background: rgba(255,255,255,0.85); border-radius: 24px; box-shadow: 0 8px 32px rgba(59,130,246,0.12); padding: 2.5rem 1.5rem; max-width: 90vw;">
                    <svg width="64" height="64" fill="none" viewBox="0 0 24 24" style="margin-bottom: 1rem;"><rect width="24" height="24" rx="12" fill="#38bdf8"/><path d="M7 17h10M9 21h6M12 3v12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
                    <h2 style="color: #0ea5e9; font-family: 'Poppins',sans-serif; font-weight: 700; margin-bottom: 0.5rem;">Desktop Only</h2>
                    <p style="color: #334155; font-size: 1.1rem; margin-bottom: 1.5rem;">Please open this page on a desktop or laptop to view the organization chart.</p>
                </div>
            `;
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        }
    } else {
        var overlay = document.getElementById('mobileOverlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = '';
        }
    }
}

// Run on load and on resize/orientation change
showMobileOverlayIfNeeded();
window.addEventListener('resize', showMobileOverlayIfNeeded);
window.addEventListener('orientationchange', showMobileOverlayIfNeeded);

// Add CSS styles for blurred text in preview mode
if (isPreviewMode) {
    $('<style>').text(`
        .blurred-text {
            background-color: #e0e0e0 !important;
            color: transparent !important;
            border-radius: 4px;
            padding: 2px 4px;
            display: inline-block;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }
        
        .blurred-text::selection {
            background: transparent;
        }
        
        .blurred-text::-moz-selection {
            background: transparent;
        }
        
        /* Preview watermark */
        body::before {
            content: "PREVIEW";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: bold;
            color: rgba(0, 0, 0, 0.05);
            z-index: 1000;
            pointer-events: none;
            user-select: none;
            font-family: Arial, sans-serif;
        }
    `).appendTo('head');
}

});