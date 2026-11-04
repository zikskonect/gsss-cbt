// sidebar.js - Shared Sidebar Logic for All Roles
// Handles responsive sidebar toggle for Teacher and Exam Office

(function() {
    'use strict';
    
    // ========================================
    // TEACHER SIDEBAR
    // ========================================
    
    window.toggleTeacherSidebar = function() {
        const sidebar = document.getElementById('teacherSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const hamburger = document.getElementById('hamburgerBtn');
        
        if (!sidebar) return;
        
        const isHidden = sidebar.classList.contains('sidebar-hidden');
        
        if (isHidden) {
            sidebar.classList.remove('sidebar-hidden');
            sidebar.classList.add('sidebar-visible');
            if (overlay) overlay.classList.add('active');
            if (hamburger) hamburger.classList.add('active');
        } else {
            sidebar.classList.add('sidebar-hidden');
            sidebar.classList.remove('sidebar-visible');
            if (overlay) overlay.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        }
    };
    
    window.closeTeacherSidebar = function() {
        const sidebar = document.getElementById('teacherSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const hamburger = document.getElementById('hamburgerBtn');
        
        if (sidebar) {
            sidebar.classList.add('sidebar-hidden');
            sidebar.classList.remove('sidebar-visible');
        }
        if (overlay) overlay.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
    };
    
    window.setPageAndCloseTeacherSidebar = function(page) {
        window.closeTeacherSidebar();
        setTimeout(() => {
            if (page === 'import') {
                if (typeof handleSmartImport === 'function') handleSmartImport();
            } else {
                if (typeof setPage === 'function') setPage(page);
            }
        }, 150);
    };
    
    // ========================================
    // EXAM OFFICE SIDEBAR
    // ========================================
    
    window.toggleExamOfficeSidebar = function() {
        const sidebar = document.getElementById('examOfficeSidebar');
        const overlay = document.getElementById('examOfficeSidebarOverlay');
        const hamburger = document.getElementById('examOfficeHamburgerBtn');
        
        if (!sidebar) return;
        
        const isHidden = sidebar.classList.contains('sidebar-hidden');
        
        if (isHidden) {
            sidebar.classList.remove('sidebar-hidden');
            sidebar.classList.add('sidebar-visible');
            if (overlay) overlay.classList.add('active');
            if (hamburger) hamburger.classList.add('active');
        } else {
            sidebar.classList.add('sidebar-hidden');
            sidebar.classList.remove('sidebar-visible');
            if (overlay) overlay.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        }
    };
    
    window.closeExamOfficeSidebar = function() {
        const sidebar = document.getElementById('examOfficeSidebar');
        const overlay = document.getElementById('examOfficeSidebarOverlay');
        const hamburger = document.getElementById('examOfficeHamburgerBtn');
        
        if (sidebar) {
            sidebar.classList.add('sidebar-hidden');
            sidebar.classList.remove('sidebar-visible');
        }
        if (overlay) overlay.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
    };
    
    window.setPageAndCloseSidebarEO = function(page) {
        window.closeExamOfficeSidebar();
        setTimeout(() => {
            if (typeof setPage === 'function') setPage(page);
        }, 150);
    };
    
    // Aliases
    window.setPageAndCloseExamOfficeSidebar = window.setPageAndCloseSidebarEO;
    window.setPageAndCloseEOSidebar = window.setPageAndCloseSidebarEO;
    
    // ========================================
    // FORCE RESET — called after every page render
    // This is the KEY FIX
    // ========================================
    
    window.resetSidebarsAfterRender = function() {
        // Force-close both sidebars
        const teacherSidebar = document.getElementById('teacherSidebar');
        const teacherOverlay = document.getElementById('sidebarOverlay');
        const teacherHamburger = document.getElementById('hamburgerBtn');
        const eoSidebar = document.getElementById('examOfficeSidebar');
        const eoOverlay = document.getElementById('examOfficeSidebarOverlay');
        const eoHamburger = document.getElementById('examOfficeHamburgerBtn');
        
        if (window.innerWidth <= 768) {
            // Mobile: force close
            if (teacherSidebar) {
                teacherSidebar.classList.add('sidebar-hidden');
                teacherSidebar.classList.remove('sidebar-visible');
            }
            if (teacherOverlay) teacherOverlay.classList.remove('active');
            if (teacherHamburger) teacherHamburger.classList.remove('active');
            
            if (eoSidebar) {
                eoSidebar.classList.add('sidebar-hidden');
                eoSidebar.classList.remove('sidebar-visible');
            }
            if (eoOverlay) eoOverlay.classList.remove('active');
            if (eoHamburger) eoHamburger.classList.remove('active');
        } else {
            // Desktop: ensure overlay is hidden and sidebar visible
            if (teacherOverlay) teacherOverlay.classList.remove('active');
            if (teacherHamburger) teacherHamburger.classList.remove('active');
            if (eoOverlay) eoOverlay.classList.remove('active');
            if (eoHamburger) eoHamburger.classList.remove('active');
        }
    };
    
    // ========================================
    // MENU ACTIVE STATE HELPERS
    // ========================================
    
    window.updateTeacherMenuActive = function(page) {
        document.querySelectorAll('.dashboard-menu-item').forEach(item => {
            item.classList.remove('menu-item-active');
            if (item.dataset.page === page) {
                item.classList.add('menu-item-active');
            }
        });
    };
    
    window.updateExamOfficeMenuActive = function(page) {
        document.querySelectorAll('.exam-office-menu-item').forEach(item => {
            item.classList.remove('menu-item-active');
            if (item.dataset.page === page) {
                item.classList.add('menu-item-active');
            }
        });
    };
    
    // ========================================
    // GLOBAL CLICK-OUTSIDE HANDLER
    // ========================================
    
    document.addEventListener('click', function(e) {
        if (window.innerWidth > 768) return;
        
        const teacherSidebar = document.getElementById('teacherSidebar');
        const teacherHamburger = document.getElementById('hamburgerBtn');
        if (teacherSidebar && !teacherSidebar.contains(e.target) && 
            !(teacherHamburger && teacherHamburger.contains(e.target))) {
            if (teacherSidebar.classList.contains('sidebar-visible')) {
                window.closeTeacherSidebar();
            }
        }
        
        const eoSidebar = document.getElementById('examOfficeSidebar');
        const eoHamburger = document.getElementById('examOfficeHamburgerBtn');
        if (eoSidebar && !eoSidebar.contains(e.target) && 
            !(eoHamburger && eoHamburger.contains(e.target))) {
            if (eoSidebar.classList.contains('sidebar-visible')) {
                window.closeExamOfficeSidebar();
            }
        }
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 769) {
            window.closeTeacherSidebar();
            window.closeExamOfficeSidebar();
        }
    });
    
    // ========================================
    // SHARED CSS
    // ========================================
    
    (function injectSidebarCSS() {
        if (document.getElementById('shared-sidebar-css')) return;
        
        const style = document.createElement('style');
        style.id = 'shared-sidebar-css';
        style.textContent = `
            .sidebar-transition {
                transition: transform 0.3s ease-in-out;
            }
            
            @media (max-width: 768px) {
                .sidebar-hidden {
                    transform: translateX(-100%) !important;
                }
                .sidebar-visible {
                    transform: translateX(0) !important;
                }
                .sidebar-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 40;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease-in-out;
                }
                .sidebar-overlay.active {
                    opacity: 1;
                    pointer-events: all;
                }
            }
            
            @media (min-width: 769px) {
                .sidebar-hidden {
                    transform: translateX(0) !important;
                }
                .sidebar-overlay {
                    display: none !important;
                }
            }
            
            .menu-item-active {
                background: linear-gradient(to right, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
                border-left: 4px solid #fff;
            }
            
            .hamburger-btn {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
            }
            .hamburger-btn span {
                display: block;
                width: 24px;
                height: 2.5px;
                background: #374151;
                border-radius: 2px;
                transition: all 0.3s ease;
            }
            .hamburger-btn.active span:nth-child(1) {
                transform: rotate(45deg) translate(4px, 5px);
            }
            .hamburger-btn.active span:nth-child(2) {
                opacity: 0;
            }
            .hamburger-btn.active span:nth-child(3) {
                transform: rotate(-45deg) translate(4px, -5px);
            }
        `;
        document.head.appendChild(style);
    })();
    
    console.log('✅ sidebar.js loaded');
})();