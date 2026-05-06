// study-tools/engine/js/data/civil-war-map-data.js
// 19 Civil War battles, capitals, and strategic cities
// viewBox 0 0 900 725
// Coordinates extracted from a Civil War map SVG (rights confirmed by user 2026-05-06)
//
// Each city has:
//   id            - stable identifier
//   name          - display name students see
//   type          - 'battle' | 'capital' | 'strategic'
//   side          - 'union' | 'confederate' | 'border' | 'contested' (for capitals/strategic only; battles use 'battle')
//   year          - year of battle, or null for cities
//   x, y          - center of the city dot in the 900x725 viewBox
//   labelOffset   - { x, y } pixel nudge for label placement (default centered above dot)
//   labelLeader   - { x, y } target endpoint for leader-line labels (cities clustered tightly)
//   description   - short factual description shown on click in Learn mode
(function() {
    'use strict';

    window.CIVIL_WAR_MAP_CITIES = [
        // ── BATTLES (13, matching the simulation) ──
        {
            id: 'fort-sumter',
            name: 'Fort Sumter',
            type: 'battle',
            side: 'battle',
            year: 1861,
            x: 516.3, y: 577.9,
            description: 'The federal fort in Charleston Harbor where the Civil War began on April 12, 1861, when Confederate cannons opened fire.'
        },
        {
            id: 'manassas',
            name: 'Manassas',
            type: 'battle',
            side: 'battle',
            year: 1861,
            x: 588.5, y: 357.7,
            labelOffset: { x: -36, y: 4 },
            description: 'Site of the First Battle of Bull Run in July 1861. The Confederate victory shattered Northern hopes for a quick war.'
        },
        {
            id: 'shiloh',
            name: 'Shiloh',
            type: 'battle',
            side: 'battle',
            year: 1862,
            x: 261.7, y: 492.2,
            labelOffset: { x: 0, y: 22 },
            description: 'April 1862 battle in Tennessee. Over 23,000 casualties in two days shocked the nation and ended dreams of an easy war.'
        },
        {
            id: 'fort-donelson',
            name: 'Fort Donelson',
            type: 'battle',
            side: 'battle',
            year: 1862,
            x: 276.1, y: 442.7,
            labelOffset: { x: 0, y: -14 },
            description: 'February 1862. Grant’s "unconditional surrender" demand here made him a Northern hero and broke the Confederate defensive line.'
        },
        {
            id: 'hampton-roads',
            name: 'Hampton Roads',
            type: 'battle',
            side: 'battle',
            year: 1862,
            x: 622.6, y: 424.6,
            labelLeader: { x: 690, y: 442 },
            description: 'March 1862 naval battle between the ironclads USS Monitor and CSS Virginia. The age of wooden warships ended that day.'
        },
        {
            id: 'sharpsburg',
            name: 'Sharpsburg',
            type: 'battle',
            side: 'battle',
            year: 1862,
            x: 580.3, y: 330.6,
            labelOffset: { x: -42, y: -8 },
            description: 'September 17, 1862, also called Antietam. The bloodiest single day in American history. Lincoln issued the Emancipation Proclamation after the Union victory.'
        },
        {
            id: 'vicksburg',
            name: 'Vicksburg',
            type: 'battle',
            side: 'battle',
            year: 1863,
            x: 185.5, y: 592.0,
            description: 'July 4, 1863. After a 47-day siege, Vicksburg surrendered to Grant. The Union now controlled the Mississippi River and split the Confederacy in two.'
        },
        {
            id: 'gettysburg',
            name: 'Gettysburg',
            type: 'battle',
            side: 'battle',
            year: 1863,
            x: 595.8, y: 316.2,
            labelOffset: { x: 0, y: -14 },
            description: 'July 1–3, 1863. Lee’s second invasion of the North ended in disaster. Over 50,000 casualties. The turning point of the war.'
        },
        {
            id: 'atlanta',
            name: 'Atlanta',
            type: 'battle',
            side: 'battle',
            year: 1864,
            x: 380.6, y: 542.4,
            description: 'September 1864. Sherman’s capture of Atlanta secured Lincoln’s re-election and split the Deep South.'
        },
        {
            id: 'bentonville',
            name: 'Bentonville',
            type: 'battle',
            side: 'battle',
            year: 1865,
            x: 563.0, y: 486.3,
            description: 'March 1865. The last major Confederate offensive against Sherman’s army. The Confederacy was already collapsing.'
        },
        {
            id: 'appomattox',
            name: 'Appomattox',
            type: 'battle',
            side: 'battle',
            year: 1865,
            x: 548.7, y: 409.7,
            labelOffset: { x: -8, y: -20 },
            description: 'April 9, 1865. Lee surrendered to Grant in the parlor of a small Virginia farmhouse, effectively ending the Civil War.'
        },

        // ── CAPITALS (3) ──
        {
            id: 'washington-dc',
            name: 'Washington D.C.',
            type: 'capital',
            side: 'union',
            year: null,
            x: 601.7, y: 351.7,
            shortName: 'D.C.',
            labelLeader: { x: 670, y: 358 },
            description: 'Capital of the United States. Lincoln directed the Union war effort from here. Site of his assassination at Ford’s Theatre in April 1865.'
        },
        {
            id: 'richmond',
            name: 'Richmond',
            type: 'capital',
            side: 'confederate',
            year: null,
            x: 589.7, y: 403.5,
            labelLeader: { x: 690, y: 400 },
            description: 'Capital of the Confederate States of America. Located only 100 miles from Washington D.C., it was the focus of much of the war’s fighting.'
        },
        {
            id: 'new-york-city',
            name: 'New York City',
            type: 'capital',
            side: 'union',
            year: null,
            x: 692.8, y: 281.8,
            description: 'Largest city in the Union. Site of the July 1863 Draft Riots, the worst civil disorder in American history before the 20th century.'
        },

        // ── STRATEGIC CITIES (3) ──
        {
            id: 'new-orleans',
            name: 'New Orleans',
            type: 'strategic',
            side: 'confederate',
            year: null,
            x: 209.7, y: 675.5,
            description: 'The South’s largest city and main port. Captured by the Union Navy in April 1862, an early blow to the Anaconda Plan’s blockade strategy.'
        },
        {
            id: 'memphis',
            name: 'Memphis',
            type: 'strategic',
            side: 'confederate',
            year: null,
            x: 210.4, y: 491.9,
            description: 'Major Mississippi River city. Captured by the Union Navy in June 1862 as part of the campaign to control the river.'
        },
        {
            id: 'savannah',
            name: 'Savannah',
            type: 'strategic',
            side: 'confederate',
            year: null,
            x: 479.8, y: 601.5,
            description: 'Endpoint of Sherman’s March to the Sea. Captured December 1864. Sherman famously offered the city to Lincoln as a Christmas gift.'
        },
        {
            id: 'columbia',
            name: 'Columbia',
            type: 'strategic',
            side: 'confederate',
            year: null,
            x: 481.5, y: 533.4,
            description: 'Capital of South Carolina, the first state to secede. Sherman’s troops burned much of the city in February 1865.'
        }
    ];

    window.CIVIL_WAR_MAP_TYPE_COLORS = {
        battle: '#8B2914',     // oxblood (matches unit accent)
        capital: '#2D4A6B',    // navy (unit primary; capital = political center)
        strategic: '#5a7a9a'   // muted blue-gray (less emphasis than battles or capitals)
    };

    // Side colors (used for capitals to show Union vs Confederate)
    window.CIVIL_WAR_MAP_SIDE_COLORS = {
        union: '#2D4A6B',
        confederate: '#8B2914',
        border: '#7a6a5c',
        battle: '#8B2914',
        contested: '#5a7a9a'
    };

    // (Base map geometry moved to civil-war-map-base.js — Natural Earth 1:50m states, lakes, rivers.)
})();
