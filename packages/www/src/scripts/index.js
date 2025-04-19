const RESPONSIVE_WIDTH = 1024;

let isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH;
const collapseBtn = document.getElementById('collapse-btn');
const collapseHeaderItems = document.getElementById('collapsed-header-items');

function onHeaderClickOutside(e) {
    if (!collapseHeaderItems.contains(e.target)) {
        toggleHeader();
    }
}

function toggleHeader() {
    if (isHeaderCollapsed) {
        // collapseHeaderItems.classList.remove("max-md:tw-opacity-0")
        collapseHeaderItems.classList.add('opacity-100');
        collapseHeaderItems.style.width = '60vw';
        collapseBtn.classList.remove('bi-list');
        collapseBtn.classList.add('bi-x', 'max-lg:tw-fixed');
        isHeaderCollapsed = false;

        setTimeout(
            () => window.addEventListener('click', onHeaderClickOutside),
            1
        );
    } else {
        collapseHeaderItems.classList.remove('opacity-100');
        collapseHeaderItems.style.width = '0vw';
        collapseBtn.classList.remove('bi-x', 'max-lg:tw-fixed');
        collapseBtn.classList.add('bi-list');
        isHeaderCollapsed = true;
        window.removeEventListener('click', onHeaderClickOutside);
    }
}

window.toggleHeader = toggleHeader;

function responsive() {
    if (window.innerWidth > RESPONSIVE_WIDTH) {
        collapseHeaderItems.style.width = '';
    } else {
        isHeaderCollapsed = true;
    }
}

window.addEventListener('resize', responsive);

/**
 * Animations
 */

const faqAccordion = document.querySelectorAll('.faq-accordion');

faqAccordion.forEach(function (btn) {
    btn.addEventListener('click', function () {
        this.classList.toggle('active');

        // Toggle 'rotate' class to rotate the arrow
        let content = this.nextElementSibling;

        // content.classList.toggle('!tw-hidden')
        if (content.style.maxHeight === '200px') {
            content.style.maxHeight = '0px';
            content.style.padding = '0px 18px';
        } else {
            content.style.maxHeight = '200px';
            content.style.padding = '20px 18px';
        }
    });
});
