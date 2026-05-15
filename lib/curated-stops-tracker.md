# Curated Places Research Tracker

Each destination = a web research session that adds 5-10 hand-picked places to `curated-stops.json`.

This library is not stop-only. A place can be:
- an en-route stop when it fits the drive corridor
- a destination spot when it is near the final city

Roady should use the same curated place library for both use cases.

Current library audit:
- 208 total curated places
- Strong coverage: Big Sur, Carmel-by-the-Sea, Monterey / Pacific Grove, Santa Cruz, Half Moon Bay, Ojai, Santa Barbara, Pismo Beach, Ventura, Solvang / Santa Ynez Valley, Temecula Wine Country, Palm Springs, Death Valley, Anza-Borrego Desert / Borrego Springs
- Partial coverage exists across SoCal Coast, Central Coast, NorCal Coast, Bay Area, Wine Country, Desert, Eastern Sierra, and Sierra Nevada
- Category mix: nature, scenic, culture, food

## Done
- [x] Big Sur (9 places: Bixby Creek Bridge, McWay Falls, Pfeiffer Beach, Partington Cove, Calla Lily Valley, Limekiln State Park, Sand Dollar Beach, Point Sur State Historic Park, Salmon Creek Falls)
- [x] Carmel-by-the-Sea (10 places: Point Lobos State Natural Reserve, China Cove and Bird Island Trail, Carmel Beach and Scenic Road Walkway, Carmel Mission Basilica, Tor House and Hawk Tower, Mission Trail Nature Preserve, Carmel River State Beach, Carmel Courtyards and Secret Passageways, Hugh Comstock Fairytale Cottages, Garrapata State Park and Soberanes Point)
- [x] Monterey / Pacific Grove (10 places: Monterey Bay Coastal Recreation Trail, Cannery Row Historic Waterfront, Pacific Biological Laboratories, Monterey State Historic Park and Path of History, Old Fisherman's Wharf and Custom House Plaza, San Carlos Beach and Breakwater Cove, Asilomar State Beach and Coast Trail, Point Pinos Lighthouse, Monarch Grove Sanctuary, Lovers Point Park)
- [x] Santa Cruz (10 places: Natural Bridges State Beach and Monarch Grove, Wilder Ranch Coast Bluffs, West Cliff Drive and Steamer Lane, Seymour Marine Discovery Center and Coastal Campus, UC Santa Cruz Arboretum and Botanic Garden, Henry Cowell Redwoods Old-Growth Loop, Roaring Camp Railroads, The Forest of Nisene Marks, Capitola Village and Venetian Court, Shark Fin Cove)
- [x] Half Moon Bay (10 places: Pillar Point Bluff and Mavericks Overlook, Fitzgerald Marine Reserve, Pillar Point Harbor and Princeton-by-the-Sea, Half Moon Bay Coastside Trail, Cowell Ranch State Beach, Poplar Beach and Wavecrest Bluffs, Main Street Half Moon Bay, Harley Farms Goat Dairy, Devil's Slide Trail, Purisima Creek Redwoods Preserve)
- [x] Ojai (10 places: Shelf Road Trail, Valley View Preserve and Fox Canyon Trail, Ventura River Preserve, Ojai Valley Trail, Bart's Books, Downtown Ojai Arcade and Libbey Park, Meditation Mount, Ojai Olive Oil Farm, Ojai Meadows Preserve, Rose Valley Falls)
- [x] Santa Barbara (16 places: Santa Barbara County Courthouse Clock Tower, Santa Barbara Botanic Garden, Ganna Walska Lotusland, Douglas Family Preserve, Arroyo Burro Beach and Boathouse, The Funk Zone, El Presidio de Santa Barbara State Historic Park, Butterfly Beach, Lizard's Mouth, Cold Spring Tavern, Mesa Lane Steps Beach, Mission Rose Garden, Alice Keck Park Memorial Garden, Franceschi Park, Chromatic Gate, Inspiration Point via Jesusita Trail)
- [x] Pismo Beach (10 places: Pismo Preserve, Pismo State Beach Monarch Butterfly Grove, Dinosaur Caves Park, Eldwayen Ocean Park Tide Pools, Margo Dodd Park, Pismo Beach Pier and Whale Watch Platform, Oceano Dunes and Pismo Dunes Natural Preserve, Oso Flaco Lake Boardwalk, Avila Valley Barn, Pirates Cove and Cave Landing)
- [x] Ventura (10 places: Serra Cross Park and Grant Park Overlook, Ventura Botanical Gardens, Surfers Point and Ventura Promenade, Ventura Harbor Village, Channel Islands Visitor Center, Mission San Buenaventura, San Buenaventura State Beach and Marina Park, Emma Wood State Beach and River Trail, Downtown Ventura Main Street and Thrift Row, Rincon Point and Bates Beach)
- [x] Solvang / Santa Ynez Valley (10 places: Old Mission Santa Ines, Elverhoj Museum of History and Art, Hans Christian Andersen Museum and The Book Loft, Solvang Vintage Motorcycle Museum, OstrichLand USA, Sunny Fields Park, Clairmont Lavender Farm, Los Olivos Corner House and Tasting Walk, Nojoqui Falls Park, Gaviota Wind Caves)
- [x] Temecula Wine Country (16 places: Briar Rose Winery, Doffo Winery and MotoDoffo Collection, Monte De Oro Winery Barrel Cellar, Europa Village Gardens, Somerset Vineyard and Winery, Old Town Temecula and Thompson & Twain, Temecula Olive Oil Company Tasting Room, Sugarplum Zoo and Chocolates, Lake Skinner Recreation Area, Santa Rosa Plateau Ecological Reserve, Mount Palomar Winery Secret Garden, Callaway Vineyard and Winery Hilltop Views, Thornton Winery Champagne Jazz Patio, Akash Winery Sunset Patio, Vail Lake Resort and Vailocity Bike Park, Pennypickle's Workshop)
- [x] Palm Springs (10 places: Moorten Botanical Garden and Cactarium, Tahquitz Canyon Waterfall Trail, Indian Canyons Palm Oasis Trails, Palm Springs Aerial Tramway, Palm Springs Visitor Center Tramway Gas Station, Architecture and Design Center, Agua Caliente Cultural Plaza and Museum, Palm Springs Windmill Tours, Sunnylands Center and Gardens, Frey House II)
- [x] Death Valley (10 places: Badwater Basin Salt Flats, Zabriskie Point, Artists Palette and Artists Drive, Mesquite Flat Sand Dunes, Dantes View, Golden Canyon and Red Cathedral, Mosaic Canyon Narrows, Natural Bridge Canyon, Ubehebe Crater, Twenty Mule Team Canyon)
- [x] Anza-Borrego Desert / Borrego Springs (10 places: Anza-Borrego Desert State Park Visitor Center, Borrego Palm Canyon Oasis Trail, Galleta Meadows Sky Art Sculptures, Fonts Point Badlands Overlook, The Slot Canyon, Hellhole Canyon and Maidenhair Falls, Cactus Loop Trail at Yaqui Pass, Little Blair Valley Pictograph Trail, Calcite Mine Road and Slot Canyons, Borrego Springs Dark Sky Viewing)

## Partial Coverage In Library
- [~] Laguna Beach / SoCal Coast (Crystal Cove State Park, Heisler Park Overlook, plus nearby San Diego/Encinitas/La Jolla/San Clemente coastal places)
- [~] San Diego (Torrey Pines State Reserve, Point Loma Lighthouse, Sunset Cliffs Natural Park, plus nearby La Jolla and Encinitas places)
- [~] Napa Valley / Sonoma (Domaine Carneros, di Rosa Center for Contemporary Art, Oxbow Public Market, Cornerstone Sonoma, Jack London State Historic Park)
- [~] Mendocino / Fort Bragg / NorCal Coast (Mendocino Village, Van Damme State Park, Glass Beach, Point Arena Lighthouse, Stornetta Public Lands)
- [~] Point Reyes / Marin / Sausalito (Point Reyes Lighthouse, Tomales Bay Oysters, Nicasio Reservoir, Muir Beach Overlook, Sausalito Waterfront, Bay Model Visitor Center)
- [~] Yosemite (Tunnel View, Glacier Point, Mariposa Grove, Wawona Covered Bridge, Olmsted Point)
- [~] Mammoth Lakes / Eastern Sierra (Convict Lake, Hot Creek Geological Site, Devil's Postpile National Monument, June Lake Loop, Mono Lake Tufa Reserve, Alabama Hills, Bodie, Manzanar)
- [~] Joshua Tree / Desert (Keys View, Cholla Cactus Garden, Pioneertown, Whitewater Preserve, Shields Date Garden, Cabazon Dinosaurs)

## Queue — 50 Most Popular California Road Trip Destinations

### Central & Northern Coast
- [x] Carmel-by-the-Sea
- [x] Monterey
- [x] Santa Cruz
- [x] Half Moon Bay
- [~] Bodega Bay
- [~] Mendocino
- [~] Fort Bragg
- [ ] Eureka / Humboldt Coast
- [x] Ojai

### Southern California Coast
- [~] Malibu
- [x] Santa Barbara
- [x] Pismo Beach
- [~] Laguna Beach
- [x] Ventura
- [x] Solvang

### Bay Area
- [~] Point Reyes
- [~] Muir Woods / Marin Headlands
- [~] Sausalito
- [~] Half Dome / Yosemite Valley

### Wine Country
- [~] Napa Valley / Calistoga
- [~] Sonoma / Healdsburg
- [x] Temecula Wine Country

### Desert
- [~] Joshua Tree
- [x] Palm Springs
- [x] Death Valley
- [x] Anza-Borrego Desert / Borrego Springs
- [ ] Trona Pinnacles — next full training target

### Sierra Nevada & Mountains
- [~] Yosemite (full coverage beyond Tunnel View)
- [ ] Sequoia / Kings Canyon
- [ ] Lake Tahoe
- [ ] Big Bear Lake
- [ ] Lake Arrowhead
- [~] Mammoth Lakes
- [~] June Lake

### Eastern Sierra (Hwy 395)
- [~] Lone Pine / Mt. Whitney
- [ ] Bishop
- [~] Bridgeport / Bodie (beyond ghost town entry)
- [~] Lee Vining / Tioga Pass

### NorCal Interior
- [ ] Mt. Shasta
- [ ] Lassen Volcanic National Park
- [ ] Gold Country (Sutter's Mill, Placerville, Nevada City)
- [ ] Lake Shasta

### Islands
- [ ] Catalina Island
- [ ] Channel Islands

### Cities as Road Trip Bases
- [ ] San Francisco (day trip gems)
- [ ] Los Angeles (beyond the obvious)
- [ ] San Diego (beyond Gaslamp)
- [ ] Sacramento (Gold Rush history)

### Unique / Underrated
- [ ] Salton Sea
- [ ] Pioneertown / Yucca Valley
- [ ] Bombay Beach
- [ ] Salvation Mountain / Slab City
