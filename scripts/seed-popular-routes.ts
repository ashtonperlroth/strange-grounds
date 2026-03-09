import postgres from "postgres";

const BATCH_SIZE = 5;

interface RouteInput {
  slug: string;
  name: string;
  description: string;
  coordinates: number[][];
  totalDistanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  activity: string;
  difficulty: string;
  region: string;
  state: string;
  bestMonths: number[];
  seasonNotes: string;
  estimatedDays: number;
  permitRequired: boolean;
  permitInfo: string | null;
  trailheadName: string;
  trailheadCoords: [number, number];
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  waypoints: WaypointInput[];
}

interface WaypointInput {
  sortOrder: number;
  name: string;
  coords: [number, number];
  elevationM: number;
  waypointType: string;
  description: string;
}

// ── Route Data ──────────────────────────────────────────────────────────

const SKI_TOURING_ROUTES: RouteInput[] = [
  {
    slug: "teton-pass-backcountry",
    name: "Teton Pass Backcountry",
    description:
      "Teton Pass is one of the most accessible and popular backcountry skiing zones in the western United States. Sitting at 8,431 feet on the Wyoming-Idaho border, the pass offers a remarkable variety of terrain from mellow glades to steep couloirs, all within minutes of the highway.\n\nThe area features multiple zones including Glory Bowl, Mt. Glory, and the Coal Creek drainage. Most lines are north-facing, holding quality powder well into spring. The approach is as simple as parking at the top of the pass and skinning uphill, making it ideal for dawn patrol missions before work.\n\nAvalanche awareness is critical here—the terrain is consequential and the snowpack can be complex. Check the Bridger-Teton Avalanche Center forecast before every outing. Despite the crowds on powder days, Teton Pass remains a world-class backcountry experience.",
    coordinates: [
      [-110.9544, 43.4953],
      [-110.9560, 43.4940],
      [-110.9580, 43.4920],
      [-110.9590, 43.4895],
      [-110.9575, 43.4870],
      [-110.9555, 43.4855],
      [-110.9540, 43.4835],
      [-110.9520, 43.4815],
    ],
    totalDistanceM: 6437,
    elevationGainM: 792,
    elevationLossM: 792,
    maxElevationM: 3170,
    minElevationM: 2570,
    activity: "ski_touring",
    difficulty: "moderate",
    region: "Tetons",
    state: "WY",
    bestMonths: [12, 1, 2, 3, 4],
    seasonNotes: "Best December through April. Spring corn cycles in April-May.",
    estimatedDays: 0.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Teton Pass Summit",
    trailheadCoords: [-110.9544, 43.4953],
    isFeatured: true,
    metaTitle: "Teton Pass Backcountry Skiing Guide",
    metaDescription:
      "Plan your backcountry skiing trip at Teton Pass, WY. Route details, conditions, and avalanche info.",
    waypoints: [
      { sortOrder: 1, name: "Teton Pass Summit Parking", coords: [-110.9544, 43.4953], elevationM: 2570, waypointType: "start", description: "Large parking area at the summit of Teton Pass. Fills early on powder days. Arrive before 7am on weekends." },
      { sortOrder: 2, name: "Glory Bowl Saddle", coords: [-110.9570, 43.4930], elevationM: 2900, waypointType: "pass", description: "Saddle above Glory Bowl. Decision point for Glory proper or traversing to Mt. Glory summit." },
      { sortOrder: 3, name: "Mt. Glory Summit", coords: [-110.9590, 43.4895], elevationM: 3170, waypointType: "summit", description: "Summit of Mt. Glory at 10,040 ft. Panoramic views of the Tetons and Snake River Valley." },
      { sortOrder: 4, name: "Coal Creek Runout", coords: [-110.9520, 43.4815], elevationM: 2570, waypointType: "end", description: "Bottom of the Coal Creek drainage. Short road walk back to cars." },
    ],
  },
  {
    slug: "little-cottonwood-canyon-circuit",
    name: "Little Cottonwood Canyon Circuit",
    description:
      "Little Cottonwood Canyon near Salt Lake City is a backcountry skiing mecca, offering some of the best snow on earth thanks to the Wasatch Range's legendary lake-effect powder. This circuit links several classic zones including Grizzly Gulch, Catherine's Pass, and the ridgeline above Alta ski resort.\n\nThe route begins at the top of Little Cottonwood Canyon and traverses through terrain that ranges from gentle meadows to steep chutes. Intermediate tourers will find plenty of mellow options, while experts can drop into more committing lines off the main ridge.\n\nProximity to Salt Lake City (30 minutes) makes this circuit accessible for day trips. The Utah Avalanche Center provides daily forecasts for this zone. Parking is limited and often requires a reservation during peak season.",
    coordinates: [
      [-111.6380, 40.5900],
      [-111.6350, 40.5880],
      [-111.6320, 40.5855],
      [-111.6280, 40.5840],
      [-111.6250, 40.5820],
      [-111.6230, 40.5805],
      [-111.6260, 40.5790],
      [-111.6300, 40.5810],
    ],
    totalDistanceM: 9656,
    elevationGainM: 975,
    elevationLossM: 975,
    maxElevationM: 3292,
    minElevationM: 2621,
    activity: "ski_touring",
    difficulty: "moderate",
    region: "Wasatch",
    state: "UT",
    bestMonths: [12, 1, 2, 3, 4],
    seasonNotes: "Peak powder from December through March. Spring touring through May.",
    estimatedDays: 0.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Grizzly Gulch Trailhead",
    trailheadCoords: [-111.6380, 40.5900],
    isFeatured: false,
    metaTitle: "Little Cottonwood Canyon Backcountry Circuit",
    metaDescription:
      "Explore the best backcountry skiing in Little Cottonwood Canyon, UT. Route info and conditions.",
    waypoints: [
      { sortOrder: 1, name: "Grizzly Gulch Trailhead", coords: [-111.6380, 40.5900], elevationM: 2621, waypointType: "start", description: "Start at the Grizzly Gulch parking area near Alta. Limited spots available." },
      { sortOrder: 2, name: "Twin Lakes Pass", coords: [-111.6320, 40.5855], elevationM: 3109, waypointType: "pass", description: "Pass connecting Grizzly Gulch to Mineral Basin. Views of Heber Valley." },
      { sortOrder: 3, name: "Catherine's Pass", coords: [-111.6250, 40.5820], elevationM: 3292, waypointType: "pass", description: "High point of the circuit with views into Big Cottonwood Canyon." },
      { sortOrder: 4, name: "Return via Alta", coords: [-111.6300, 40.5810], elevationM: 2621, waypointType: "end", description: "Ski back to the trailhead via the Grizzly Gulch drainage." },
    ],
  },
  {
    slug: "berthoud-pass-backcountry",
    name: "Berthoud Pass Backcountry",
    description:
      "Berthoud Pass on US-40 west of Denver is Colorado's most accessible backcountry skiing destination. At 11,315 feet, the pass sits at treeline, offering both gladed tree skiing and open alpine terrain.\n\nThe east side features steep chutes and exposed alpine bowls, while the west side has more moderate tree skiing. Current Creek, First Creek, and Second Creek are all popular drainages. The standard circuit skins up from the pass, tours along the Continental Divide, and descends back to the highway.\n\nThe Colorado Avalanche Information Center covers this zone extensively. Snow quality can be variable due to Colorado's shallow snowpack, but when conditions align, Berthoud delivers world-class skiing just 60 miles from Denver.",
    coordinates: [
      [-105.7775, 39.7983],
      [-105.7790, 39.7960],
      [-105.7810, 39.7935],
      [-105.7830, 39.7910],
      [-105.7815, 39.7885],
      [-105.7795, 39.7865],
      [-105.7770, 39.7850],
    ],
    totalDistanceM: 5632,
    elevationGainM: 640,
    elevationLossM: 640,
    maxElevationM: 3810,
    minElevationM: 3450,
    activity: "ski_touring",
    difficulty: "moderate",
    region: "Front Range",
    state: "CO",
    bestMonths: [11, 12, 1, 2, 3, 4, 5],
    seasonNotes: "Season runs November through May. Best stability mid-winter.",
    estimatedDays: 0.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Berthoud Pass Summit",
    trailheadCoords: [-105.7775, 39.7983],
    isFeatured: false,
    metaTitle: "Berthoud Pass Backcountry Skiing Guide",
    metaDescription:
      "Ski touring guide for Berthoud Pass, CO. Route details, approach, and conditions.",
    waypoints: [
      { sortOrder: 1, name: "Berthoud Pass Summit Lot", coords: [-105.7775, 39.7983], elevationM: 3450, waypointType: "start", description: "Park at the summit of Berthoud Pass. Plowed lot on the west side." },
      { sortOrder: 2, name: "Continental Divide Ridge", coords: [-105.7810, 39.7935], elevationM: 3810, waypointType: "pass", description: "Ridgeline along the Continental Divide. Choose your descent line from here." },
      { sortOrder: 3, name: "Current Creek Drainage", coords: [-105.7795, 39.7865], elevationM: 3500, waypointType: "waypoint", description: "Mid-slope in the Current Creek drainage. Gladed terrain with excellent tree skiing." },
      { sortOrder: 4, name: "Highway Return", coords: [-105.7770, 39.7850], elevationM: 3450, waypointType: "end", description: "Reach US-40 below the pass. Short hitchhike or car shuttle back to summit." },
    ],
  },
  {
    slug: "mt-baker-backcountry",
    name: "Mt. Baker Backcountry",
    description:
      "Mt. Baker in Washington's North Cascades holds the world record for single-season snowfall (1,140 inches in 1998-99) and offers some of the deepest, most consistent powder in North America. The backcountry zones around Mt. Baker Ski Area provide exceptional touring.\n\nThe route explores the area around Shuksan Arm, Herman Saddle, and the Table Mountain area. Terrain ranges from moderate open bowls to steep couloirs on the flanks of Mt. Shuksan. The maritime snowpack creates a unique skiing experience with deep consolidated bases.\n\nThe Northwest Avalanche Center provides forecasts for this zone. Weather can be severe—whiteouts and high winds are common. Carry navigation tools and be prepared for rapid weather changes. When the skies clear, the views of Baker and Shuksan are unmatched.",
    coordinates: [
      [-121.6920, 48.8567],
      [-121.6900, 48.8545],
      [-121.6870, 48.8520],
      [-121.6840, 48.8500],
      [-121.6810, 48.8480],
      [-121.6780, 48.8465],
      [-121.6800, 48.8445],
    ],
    totalDistanceM: 8045,
    elevationGainM: 914,
    elevationLossM: 914,
    maxElevationM: 1830,
    minElevationM: 1280,
    activity: "ski_touring",
    difficulty: "strenuous",
    region: "Cascades",
    state: "WA",
    bestMonths: [12, 1, 2, 3, 4, 5],
    seasonNotes: "Massive snowfall November through May. Best touring March-May for stability.",
    estimatedDays: 0.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Mt. Baker Ski Area Lot",
    trailheadCoords: [-121.6920, 48.8567],
    isFeatured: false,
    metaTitle: "Mt. Baker Backcountry Skiing",
    metaDescription:
      "Backcountry skiing near Mt. Baker, WA. Deep powder, big terrain, route info.",
    waypoints: [
      { sortOrder: 1, name: "Upper Ski Area Lot", coords: [-121.6920, 48.8567], elevationM: 1280, waypointType: "start", description: "Start from the upper parking lot at Mt. Baker Ski Area." },
      { sortOrder: 2, name: "Herman Saddle", coords: [-121.6870, 48.8520], elevationM: 1585, waypointType: "pass", description: "Saddle with views of Mt. Shuksan's north face. Common lunch spot." },
      { sortOrder: 3, name: "Shuksan Arm High Point", coords: [-121.6810, 48.8480], elevationM: 1830, waypointType: "summit", description: "Highest accessible point on the Shuksan Arm ridge." },
      { sortOrder: 4, name: "Table Mountain Base", coords: [-121.6800, 48.8445], elevationM: 1400, waypointType: "end", description: "Base of Table Mountain. Multiple descent options back to the ski area." },
    ],
  },
  {
    slug: "glacier-national-park-ski-tour",
    name: "Glacier National Park Ski Tour",
    description:
      "Glacier National Park transforms into a backcountry skiing paradise in winter, with Going-to-the-Sun Road providing a groomed approach corridor to spectacular alpine terrain. The route follows the road to Logan Pass before branching into the surrounding peaks.\n\nThe area around Logan Pass offers rolling alpine terrain with options for all skill levels. Moderate tours explore the Oberlin Meadows area, while advanced skiers can access steeper terrain on the flanks of Mt. Oberlin and Clements Mountain. The snowpack is generally deep and the terrain is dramatic.\n\nWinter access requires skiing or snowshoeing the closed highway, which adds significant distance but rewards with utter solitude. Check with the Flathead Avalanche Center for current conditions. The park requires no additional permits for day touring.",
    coordinates: [
      [-113.7180, 48.6800],
      [-113.7200, 48.6820],
      [-113.7230, 48.6850],
      [-113.7260, 48.6875],
      [-113.7280, 48.6900],
      [-113.7310, 48.6930],
    ],
    totalDistanceM: 19312,
    elevationGainM: 1067,
    elevationLossM: 1067,
    maxElevationM: 2026,
    minElevationM: 1490,
    activity: "ski_touring",
    difficulty: "strenuous",
    region: "Northern Rockies",
    state: "MT",
    bestMonths: [1, 2, 3, 4],
    seasonNotes: "Best January through April. Road corridor provides approach but adds distance.",
    estimatedDays: 1.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Lake McDonald Lodge",
    trailheadCoords: [-113.7180, 48.6800],
    isFeatured: false,
    metaTitle: "Glacier National Park Ski Touring",
    metaDescription:
      "Winter ski touring in Glacier National Park, MT. Logan Pass route details and conditions.",
    waypoints: [
      { sortOrder: 1, name: "Lake McDonald Lodge", coords: [-113.7180, 48.6800], elevationM: 1490, waypointType: "start", description: "Start from the Lake McDonald Lodge area. Road is closed to vehicles in winter." },
      { sortOrder: 2, name: "The Loop", coords: [-113.7230, 48.6850], elevationM: 1645, waypointType: "waypoint", description: "The Loop hairpin turn on Going-to-the-Sun Road. Good rest stop." },
      { sortOrder: 3, name: "Logan Pass", coords: [-113.7310, 48.6930], elevationM: 2026, waypointType: "pass", description: "Logan Pass visitor center area. Alpine terrain opens up in all directions." },
    ],
  },
  {
    slug: "tahoe-backcountry",
    name: "Tahoe Backcountry – Mt. Rose",
    description:
      "The Lake Tahoe region offers extensive backcountry skiing with the Mt. Rose corridor being one of the most popular and accessible zones. Located on the Nevada side of the lake, Mt. Rose provides over 3,000 feet of vertical with a mix of gladed forest and open alpine terrain.\n\nThe route ascends from the Mt. Rose Highway through gradually steepening terrain to the summit plateau. The Chutes—a series of steep northeast-facing gullies—are the main attraction for advanced skiers. More moderate terrain can be found in the meadows and glades below.\n\nThe Sierra Avalanche Center monitors this area. The Carson Range snowpack is typically more continental than the crest, offering lighter powder. The views of Lake Tahoe from the summit ridge are spectacular on clear days.",
    coordinates: [
      [-119.9175, 39.3200],
      [-119.9190, 39.3180],
      [-119.9210, 39.3155],
      [-119.9230, 39.3130],
      [-119.9250, 39.3105],
      [-119.9270, 39.3080],
    ],
    totalDistanceM: 7242,
    elevationGainM: 945,
    elevationLossM: 945,
    maxElevationM: 3285,
    minElevationM: 2590,
    activity: "ski_touring",
    difficulty: "moderate",
    region: "Sierra Nevada",
    state: "CA",
    bestMonths: [12, 1, 2, 3, 4],
    seasonNotes: "Best December through April. Sierra cement gives way to lighter snow in cold storms.",
    estimatedDays: 0.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Mt. Rose Summit Trailhead",
    trailheadCoords: [-119.9175, 39.3200],
    isFeatured: false,
    metaTitle: "Tahoe Backcountry Skiing – Mt. Rose",
    metaDescription:
      "Backcountry skiing at Mt. Rose near Lake Tahoe. Route info, conditions, and avalanche details.",
    waypoints: [
      { sortOrder: 1, name: "Mt. Rose Highway Trailhead", coords: [-119.9175, 39.3200], elevationM: 2590, waypointType: "start", description: "Park at the Mt. Rose trailhead off Highway 431." },
      { sortOrder: 2, name: "Tamarack Lake Basin", coords: [-119.9210, 39.3155], elevationM: 2835, waypointType: "water", description: "Frozen Tamarack Lake area. Open meadows for moderate skiing." },
      { sortOrder: 3, name: "Mt. Rose Summit Ridge", coords: [-119.9270, 39.3080], elevationM: 3285, waypointType: "summit", description: "Summit plateau of Mt. Rose. Access to The Chutes from here." },
    ],
  },
  {
    slug: "san-juan-hut-route",
    name: "San Juan Hut Route",
    description:
      "The San Juan Hut Route is a multi-day ski touring traverse through Colorado's San Juan Mountains, connecting a series of backcountry huts between Ouray and Telluride. This is one of the premier hut-to-hut ski experiences in North America.\n\nThe route traverses through high alpine terrain above 10,000 feet, crossing several passes and ridgelines with spectacular views of the San Juan range. Each hut is fully equipped with bunks, a wood stove, cooking supplies, and basic provisions. The terrain between huts varies from mellow touring to steeper descents into valleys.\n\nAdvanced backcountry skills are essential—navigation, avalanche assessment, and winter camping proficiency. The San Juan Avalanche Center provides forecasts. Hut reservations are required and book months in advance for peak season.",
    coordinates: [
      [-107.6700, 37.9550],
      [-107.6850, 37.9470],
      [-107.7000, 37.9380],
      [-107.7200, 37.9300],
      [-107.7400, 37.9200],
      [-107.7600, 37.9100],
      [-107.7812, 37.9375],
    ],
    totalDistanceM: 35400,
    elevationGainM: 2438,
    elevationLossM: 2590,
    maxElevationM: 3900,
    minElevationM: 2773,
    activity: "ski_touring",
    difficulty: "expert",
    region: "San Juans",
    state: "CO",
    bestMonths: [1, 2, 3],
    seasonNotes: "January through March for best conditions. Huts booked well in advance.",
    estimatedDays: 5.0,
    permitRequired: true,
    permitInfo: "Hut reservations required through San Juan Hut Systems. Book 3-6 months ahead.",
    trailheadName: "Ouray Trailhead",
    trailheadCoords: [-107.6700, 37.9550],
    isFeatured: true,
    metaTitle: "San Juan Hut-to-Hut Ski Route",
    metaDescription:
      "Multi-day hut ski traverse in Colorado's San Juan Mountains. Route, hut info, and planning.",
    waypoints: [
      { sortOrder: 1, name: "Ouray Departure", coords: [-107.6700, 37.9550], elevationM: 2773, waypointType: "start", description: "Begin the traverse from the Ouray area. Shuttle service available." },
      { sortOrder: 2, name: "First San Juan Hut", coords: [-107.6850, 37.9470], elevationM: 3350, waypointType: "camp", description: "First hut along the route. Warm up by the wood stove after a big approach day." },
      { sortOrder: 3, name: "Ridgeline Pass", coords: [-107.7200, 37.9300], elevationM: 3900, waypointType: "pass", description: "High point of the traverse. Exposed ridge—be prepared for wind." },
      { sortOrder: 4, name: "Last Dollar Hut", coords: [-107.7600, 37.9100], elevationM: 3200, waypointType: "camp", description: "Final hut before the descent to Telluride. Sunset views are remarkable." },
      { sortOrder: 5, name: "Telluride Finish", coords: [-107.7812, 37.9375], elevationM: 2667, waypointType: "end", description: "Arrive in Telluride. Celebrate at a local brewery." },
    ],
  },
  {
    slug: "grand-teton-ski-descent",
    name: "Grand Teton Ski Descent",
    description:
      "Skiing the Grand Teton is the ultimate objective for advanced backcountry skiers in the Tetons. The Ford-Stettner couloir and Stettner couloir provide the most popular ski descent routes from the 13,775-foot summit, requiring expert mountaineering and skiing skills.\n\nThe approach begins at the Lupine Meadows trailhead and ascends through Garnet Canyon to the Lower Saddle at 11,600 feet. From the saddle, the route climbs through increasingly technical terrain to the summit. The ski descent involves sustained 45-50 degree slopes with exposure.\n\nThis is a serious mountaineering objective that requires perfect conditions, expert skills, and fitness. Most parties stage at the Lower Saddle bivy site. Spring is the preferred season when the snow is consolidated but before it melts out. A climbing permit is required.",
    coordinates: [
      [-110.7730, 43.7370],
      [-110.7800, 43.7400],
      [-110.7850, 43.7430],
      [-110.7900, 43.7460],
      [-110.7940, 43.7490],
      [-110.8020, 43.7410],
    ],
    totalDistanceM: 20921,
    elevationGainM: 2195,
    elevationLossM: 2195,
    maxElevationM: 4199,
    minElevationM: 2073,
    activity: "ski_touring",
    difficulty: "expert",
    region: "Tetons",
    state: "WY",
    bestMonths: [4, 5, 6],
    seasonNotes: "Late April through mid-June. Requires consolidated spring snow conditions.",
    estimatedDays: 2.0,
    permitRequired: true,
    permitInfo: "Climbing permit required from Grand Teton National Park. Register at Jenny Lake Ranger Station.",
    trailheadName: "Lupine Meadows Trailhead",
    trailheadCoords: [-110.7730, 43.7370],
    isFeatured: true,
    metaTitle: "Grand Teton Ski Descent Guide",
    metaDescription:
      "Ski mountaineering on the Grand Teton, WY. Route details, permits, and conditions.",
    waypoints: [
      { sortOrder: 1, name: "Lupine Meadows Trailhead", coords: [-110.7730, 43.7370], elevationM: 2073, waypointType: "start", description: "Main trailhead for Grand Teton climbs. Large parking area." },
      { sortOrder: 2, name: "Garnet Canyon Junction", coords: [-110.7800, 43.7400], elevationM: 2896, waypointType: "waypoint", description: "Junction where the trail enters Garnet Canyon." },
      { sortOrder: 3, name: "Lower Saddle", coords: [-110.7850, 43.7430], elevationM: 3536, waypointType: "camp", description: "Bivy site at the Lower Saddle (11,600 ft). Most parties spend the night here." },
      { sortOrder: 4, name: "Grand Teton Summit", coords: [-110.8020, 43.7410], elevationM: 4199, waypointType: "summit", description: "Summit of the Grand Teton at 13,775 ft. Begin ski descent from here." },
    ],
  },
];

const BACKPACKING_ROUTES: RouteInput[] = [
  {
    slug: "teton-crest-trail",
    name: "Teton Crest Trail",
    description:
      "The Teton Crest Trail is the premier backpacking route in Grand Teton National Park, traversing the spine of the Teton Range for approximately 40 miles. The trail passes through some of the most dramatic alpine scenery in the lower 48, with jagged granite spires, wildflower-filled meadows, and pristine mountain lakes at every turn.\n\nThe classic route begins at Teton Village (via the aerial tram) and ends at Paintbrush Canyon trailhead. Highlights include Hurricane Pass with its views of the Grand Teton, the Teton Shelf—a high plateau with unmatched panoramas—and the ascent over Paintbrush Divide at 10,700 feet.\n\nPermits are required and highly competitive. Apply in the January lottery for summer dates. Water is available at most camps but should be treated. Bear canisters are required for food storage. The trail is typically snow-free from mid-July through September.",
    coordinates: [
      [-110.8280, 43.5875],
      [-110.8300, 43.6000],
      [-110.8250, 43.6150],
      [-110.8200, 43.6300],
      [-110.8150, 43.6450],
      [-110.8100, 43.6600],
      [-110.8050, 43.6750],
      [-110.7950, 43.6900],
      [-110.7850, 43.7100],
      [-110.7750, 43.7250],
      [-110.7700, 43.7400],
      [-110.7600, 43.7550],
    ],
    totalDistanceM: 64374,
    elevationGainM: 3353,
    elevationLossM: 3657,
    maxElevationM: 3261,
    minElevationM: 2012,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Tetons",
    state: "WY",
    bestMonths: [7, 8, 9],
    seasonNotes: "Typically snow-free mid-July through September. Peak wildflowers in late July.",
    estimatedDays: 4.0,
    permitRequired: true,
    permitInfo: "Backcountry camping permit required. Apply in January lottery at recreation.gov. Walk-up permits available but limited.",
    trailheadName: "Teton Village Aerial Tram",
    trailheadCoords: [-110.8280, 43.5875],
    isFeatured: true,
    metaTitle: "Teton Crest Trail Backpacking Guide",
    metaDescription:
      "Plan your Teton Crest Trail thru-hike. Permits, itinerary, and conditions for this iconic Wyoming route.",
    waypoints: [
      { sortOrder: 1, name: "Teton Village Tram Top", coords: [-110.8280, 43.5875], elevationM: 3185, waypointType: "start", description: "Ride the Jackson Hole aerial tram to the summit of Rendezvous Mountain." },
      { sortOrder: 2, name: "Marion Lake Camp", coords: [-110.8250, 43.6150], elevationM: 2896, waypointType: "camp", description: "First night camp at Marion Lake. Established sites with bear boxes." },
      { sortOrder: 3, name: "Hurricane Pass", coords: [-110.8150, 43.6450], elevationM: 3170, waypointType: "pass", description: "Dramatic pass with direct views of the Grand Teton and South Teton." },
      { sortOrder: 4, name: "South Fork Cascade Camp", coords: [-110.8050, 43.6750], elevationM: 2743, waypointType: "camp", description: "Sheltered camping along the South Fork of Cascade Creek. Bear boxes available." },
      { sortOrder: 5, name: "Lake Solitude", coords: [-110.7850, 43.7100], elevationM: 2954, waypointType: "water", description: "Stunning alpine lake in the North Fork of Cascade Canyon." },
      { sortOrder: 6, name: "Paintbrush Divide", coords: [-110.7750, 43.7250], elevationM: 3261, waypointType: "pass", description: "Highest point on the trail at 10,700 ft. Steep descent into Paintbrush Canyon." },
      { sortOrder: 7, name: "String Lake Trailhead", coords: [-110.7600, 43.7550], elevationM: 2060, waypointType: "end", description: "Northern terminus at String Lake. Arrange shuttle back to Teton Village." },
    ],
  },
  {
    slug: "wind-river-high-route",
    name: "Wind River High Route",
    description:
      "The Wind River High Route is an off-trail alpine traverse through Wyoming's Wind River Range, following a path first described by backpacker Alan Dixon. This ~80-mile route stays almost entirely above treeline, crossing passes above 12,000 feet and traversing some of the most remote terrain in the contiguous United States.\n\nThe route passes beneath the Continental Divide, skirting glaciers and crossing through talus fields, boulder-strewn valleys, and alpine meadows. Navigation skills are essential—there is no maintained trail for much of the route. The Cirque of the Towers and the views of Gannett Peak (Wyoming's highest) are highlights.\n\nThis is a serious undertaking requiring strong navigation, scrambling ability, and experience in remote backcountry travel. Weather can be severe above treeline. Most parties take 7-10 days and carry 8+ days of food. Water is abundant from snowmelt streams and alpine lakes.",
    coordinates: [
      [-109.1700, 42.7800],
      [-109.1800, 42.7600],
      [-109.1900, 42.7400],
      [-109.2000, 42.7200],
      [-109.2100, 42.7000],
      [-109.2200, 42.6800],
      [-109.2300, 42.6600],
      [-109.2400, 42.6400],
      [-109.2500, 42.6200],
      [-109.2600, 42.6000],
      [-109.2700, 42.5800],
    ],
    totalDistanceM: 128748,
    elevationGainM: 7315,
    elevationLossM: 7620,
    maxElevationM: 3810,
    minElevationM: 2743,
    activity: "backpacking",
    difficulty: "expert",
    region: "Wind River Range",
    state: "WY",
    bestMonths: [7, 8, 9],
    seasonNotes: "Late July through mid-September. Early season snow on passes. Short weather windows.",
    estimatedDays: 8.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Green River Lakes Trailhead",
    trailheadCoords: [-109.1700, 42.7800],
    isFeatured: false,
    metaTitle: "Wind River High Route Backpacking Guide",
    metaDescription:
      "Plan the Wind River High Route in Wyoming. Off-trail alpine traverse, navigation, and planning tips.",
    waypoints: [
      { sortOrder: 1, name: "Green River Lakes", coords: [-109.1700, 42.7800], elevationM: 2438, waypointType: "start", description: "Northern terminus with dramatic views of Squaretop Mountain." },
      { sortOrder: 2, name: "Vista Pass", coords: [-109.1900, 42.7400], elevationM: 3505, waypointType: "pass", description: "First major pass. Off-trail from here—compass and map essential." },
      { sortOrder: 3, name: "Titcomb Basin", coords: [-109.2100, 42.7000], elevationM: 3200, waypointType: "camp", description: "Spectacular alpine basin beneath Fremont Peak. Turquoise lakes." },
      { sortOrder: 4, name: "Cirque of the Towers", coords: [-109.2400, 42.6400], elevationM: 3109, waypointType: "camp", description: "Iconic granite cirque. World-class climbing and stunning camping." },
      { sortOrder: 5, name: "Big Sandy Opening", coords: [-109.2700, 42.5800], elevationM: 2743, waypointType: "end", description: "Southern terminus at Big Sandy. Rough dirt road to highway." },
    ],
  },
  {
    slug: "mineral-king-to-whitney",
    name: "Mineral King to Mt. Whitney",
    description:
      "This spectacular Sierra Nevada traverse connects Mineral King in Sequoia National Park to the summit of Mt. Whitney via the High Sierra Trail and John Muir Trail. The route passes through some of the most dramatic scenery in the Sierra, including the Great Western Divide, the Kern River Canyon, and the highest peak in the lower 48.\n\nStarting from Mineral King at 7,800 feet, the trail climbs over Timber Gap and connects to the High Sierra Trail near the Kaweah River. The route then traverses the spine of the Sierra through alpine meadows, past turquoise lakes, and over several passes before the final push to Whitney's 14,505-foot summit.\n\nThis is a challenging route requiring excellent fitness and acclimatization. A Whitney Zone permit is needed for the final summit approach. Resupply is possible at limited points. Bear canisters are mandatory throughout Sequoia and Kings Canyon.",
    coordinates: [
      [-118.5950, 36.4520],
      [-118.5800, 36.4600],
      [-118.5600, 36.4700],
      [-118.5400, 36.4900],
      [-118.5200, 36.5100],
      [-118.5000, 36.5300],
      [-118.4800, 36.5500],
      [-118.4600, 36.5700],
      [-118.2920, 36.5786],
    ],
    totalDistanceM: 113000,
    elevationGainM: 6400,
    elevationLossM: 5200,
    maxElevationM: 4421,
    minElevationM: 2380,
    activity: "backpacking",
    difficulty: "expert",
    region: "Sierra Nevada",
    state: "CA",
    bestMonths: [7, 8, 9],
    seasonNotes: "Mid-July through September. Passes may hold snow into August in big snow years.",
    estimatedDays: 7.0,
    permitRequired: true,
    permitInfo: "Wilderness permit required from Sequoia NP. Whitney Zone permit also needed for summit day.",
    trailheadName: "Mineral King Ranger Station",
    trailheadCoords: [-118.5950, 36.4520],
    isFeatured: false,
    metaTitle: "Mineral King to Mt. Whitney Backpacking",
    metaDescription:
      "Sierra Nevada traverse from Mineral King to Mt. Whitney. Route details, permits, and planning.",
    waypoints: [
      { sortOrder: 1, name: "Mineral King Ranger Station", coords: [-118.5950, 36.4520], elevationM: 2380, waypointType: "start", description: "Start at Mineral King. Long winding road to trailhead—watch for marmots." },
      { sortOrder: 2, name: "Timber Gap", coords: [-118.5800, 36.4600], elevationM: 2926, waypointType: "pass", description: "First pass of the route. Views of the Mineral King valley." },
      { sortOrder: 3, name: "Kern Hot Spring", coords: [-118.5200, 36.5100], elevationM: 1920, waypointType: "camp", description: "Natural hot spring along the Kern River. Perfect rest day camp." },
      { sortOrder: 4, name: "Guitar Lake", coords: [-118.3100, 36.5700], elevationM: 3489, waypointType: "camp", description: "Base camp for Whitney summit. Named for its guitar shape." },
      { sortOrder: 5, name: "Mt. Whitney Summit", coords: [-118.2920, 36.5786], elevationM: 4421, waypointType: "summit", description: "Highest point in the lower 48 at 14,505 feet." },
    ],
  },
  {
    slug: "enchantments-traverse",
    name: "Enchantments Traverse",
    description:
      "The Enchantments is a stunning alpine area in Washington's Alpine Lakes Wilderness, featuring crystal-clear lakes set among golden larch trees and granite peaks. The through-hike from Stuart Lake to Snow Lakes is one of the most sought-after overnight trips in the Pacific Northwest.\n\nThe core zone contains over a dozen named lakes, each more beautiful than the last, connected by granite slabs and alpine meadows. In late September, the larch trees turn golden, creating one of the most photographed landscapes in Washington. The traverse crosses Aasgard Pass, a grueling 2,000-foot climb up loose talus.\n\nOvernight permits are extremely competitive—the lottery typically has a 2-5% success rate. Day hikers can do the traverse as a long day (18 miles, 4,500 feet of gain), but it requires starting before dawn. The terrain is rugged and exposed with limited water sources in the upper zone.",
    coordinates: [
      [-120.7200, 47.5280],
      [-120.7150, 47.5250],
      [-120.7100, 47.5200],
      [-120.7050, 47.5150],
      [-120.7000, 47.5100],
      [-120.6950, 47.5050],
      [-120.6900, 47.5000],
      [-120.6830, 47.4930],
    ],
    totalDistanceM: 29000,
    elevationGainM: 2073,
    elevationLossM: 2377,
    maxElevationM: 2347,
    minElevationM: 548,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Cascades",
    state: "WA",
    bestMonths: [7, 8, 9, 10],
    seasonNotes: "July through early October. Larch color in late September is spectacular.",
    estimatedDays: 2.0,
    permitRequired: true,
    permitInfo: "Overnight permits through lottery at recreation.gov. Apply in February-March. Day use does not require permit.",
    trailheadName: "Stuart Lake Trailhead",
    trailheadCoords: [-120.7200, 47.5280],
    isFeatured: true,
    metaTitle: "Enchantments Traverse Backpacking Guide",
    metaDescription:
      "Plan the Enchantments traverse in Washington. Permit lottery tips, route details, and larch season info.",
    waypoints: [
      { sortOrder: 1, name: "Stuart Lake Trailhead", coords: [-120.7200, 47.5280], elevationM: 1050, waypointType: "start", description: "Start from the Stuart Lake trailhead off Icicle Creek Road." },
      { sortOrder: 2, name: "Colchuck Lake", coords: [-120.7100, 47.5200], elevationM: 1570, waypointType: "water", description: "Stunning turquoise alpine lake. Camping available with permit." },
      { sortOrder: 3, name: "Aasgard Pass", coords: [-120.7050, 47.5150], elevationM: 2347, waypointType: "pass", description: "Brutal 2,000-ft talus scramble. The crux of the traverse." },
      { sortOrder: 4, name: "Core Enchantments Zone", coords: [-120.6950, 47.5050], elevationM: 2200, waypointType: "camp", description: "The heart of the Enchantments. Lakes Viviane, Leprechaun, and Sprite." },
      { sortOrder: 5, name: "Snow Lakes Trailhead", coords: [-120.6830, 47.4930], elevationM: 548, waypointType: "end", description: "Long descent to the Snow Lakes trailhead. Arrange car shuttle." },
    ],
  },
  {
    slug: "collegiate-peaks-loop",
    name: "Collegiate Peaks Loop",
    description:
      "The Collegiate Peaks Wilderness in central Colorado offers a challenging loop route through some of the state's highest peaks—all named after Ivy League universities. The route circles through alpine terrain between the towns of Buena Vista and Leadville, crossing the Continental Divide multiple times.\n\nThe loop connects segments of the Colorado Trail and Continental Divide Trail, passing beneath Mt. Harvard (14,420 ft), Mt. Columbia (14,073 ft), and Mt. Yale (14,196 ft). The terrain alternates between dense spruce forests, alpine tundra, and sweeping above-treeline ridges.\n\nWater sources are generally reliable from snowmelt streams, though some sections can be dry in late season. The loop crosses several high passes above 12,000 feet where weather can be severe. Start early each day to avoid afternoon thunderstorms, which are almost daily occurrences in July and August.",
    coordinates: [
      [-106.3200, 38.8700],
      [-106.3400, 38.8900],
      [-106.3600, 38.9100],
      [-106.3800, 38.9300],
      [-106.3600, 38.9500],
      [-106.3400, 38.9400],
      [-106.3200, 38.9200],
      [-106.3100, 38.8900],
    ],
    totalDistanceM: 79000,
    elevationGainM: 4267,
    elevationLossM: 4267,
    maxElevationM: 3810,
    minElevationM: 2743,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Sawatch Range",
    state: "CO",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September. Afternoon thunderstorms common—start early.",
    estimatedDays: 5.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Collegiate Peaks TH",
    trailheadCoords: [-106.3200, 38.8700],
    isFeatured: false,
    metaTitle: "Collegiate Peaks Loop Backpacking",
    metaDescription:
      "Loop route through Colorado's Collegiate Peaks Wilderness. 14ers, Continental Divide, and planning info.",
    waypoints: [
      { sortOrder: 1, name: "North Cottonwood Trailhead", coords: [-106.3200, 38.8700], elevationM: 2926, waypointType: "start", description: "Start from the North Cottonwood Creek trailhead near Buena Vista." },
      { sortOrder: 2, name: "Horn Fork Basin", coords: [-106.3400, 38.8900], elevationM: 3505, waypointType: "camp", description: "Alpine basin beneath Mt. Harvard. Beautiful camping with creek access." },
      { sortOrder: 3, name: "Continental Divide Crossing", coords: [-106.3800, 38.9300], elevationM: 3810, waypointType: "pass", description: "Cross the Continental Divide at Lake Ann Pass." },
      { sortOrder: 4, name: "Pine Creek Camp", coords: [-106.3400, 38.9400], elevationM: 2896, waypointType: "camp", description: "Forested camp along Pine Creek. Good water access." },
      { sortOrder: 5, name: "Return to Trailhead", coords: [-106.3100, 38.8900], elevationM: 2926, waypointType: "end", description: "Complete the loop back to the starting trailhead." },
    ],
  },
  {
    slug: "four-pass-loop",
    name: "Four Pass Loop",
    description:
      "The Four Pass Loop near Aspen, Colorado is one of the most popular backpacking routes in the state, circumnavigating the Maroon Bells-Snowmass Wilderness over four passes above 12,000 feet. The 27-mile loop can be completed in 2-4 days and offers non-stop alpine scenery.\n\nThe route crosses West Maroon Pass, Frigid Air Pass, Trail Rider Pass, and Buckskin Pass, with each pass delivering panoramic views of the Elk Mountains. Between passes, the trail descends into wildflower-filled valleys with reliable water from snowmelt streams. The Maroon Bells themselves—perhaps Colorado's most iconic peaks—are visible from multiple points.\n\nThe loop is best done counterclockwise, starting from Maroon Lake. Camping is available at designated sites in some valleys. The area sees heavy use in July and August. Bear canisters are required. Afternoon thunderstorms are almost guaranteed, so plan to be below treeline by noon.",
    coordinates: [
      [-106.9390, 39.0710],
      [-106.9500, 39.0600],
      [-106.9650, 39.0500],
      [-106.9800, 39.0450],
      [-106.9900, 39.0550],
      [-106.9850, 39.0700],
      [-106.9700, 39.0800],
      [-106.9500, 39.0780],
    ],
    totalDistanceM: 43452,
    elevationGainM: 3048,
    elevationLossM: 3048,
    maxElevationM: 3810,
    minElevationM: 2896,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Elk Mountains",
    state: "CO",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September. Snow on passes possible into July.",
    estimatedDays: 3.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Maroon Lake Trailhead",
    trailheadCoords: [-106.9390, 39.0710],
    isFeatured: true,
    metaTitle: "Four Pass Loop Backpacking Guide",
    metaDescription:
      "Plan the Four Pass Loop near Aspen, CO. Four 12,000+ ft passes, Maroon Bells views, and trip planning.",
    waypoints: [
      { sortOrder: 1, name: "Maroon Lake", coords: [-106.9390, 39.0710], elevationM: 2926, waypointType: "start", description: "Start at Maroon Lake with views of the Maroon Bells. Take the bus from Aspen." },
      { sortOrder: 2, name: "West Maroon Pass", coords: [-106.9500, 39.0600], elevationM: 3749, waypointType: "pass", description: "First pass at 12,500 ft. Views of Maroon Peak and Pyramid Peak." },
      { sortOrder: 3, name: "Frigid Air Pass", coords: [-106.9650, 39.0500], elevationM: 3810, waypointType: "pass", description: "Second and highest pass. Steep approach from the Fravert Basin side." },
      { sortOrder: 4, name: "Trail Rider Pass", coords: [-106.9900, 39.0550], elevationM: 3719, waypointType: "pass", description: "Third pass. Snowmass Lake visible from the descent." },
      { sortOrder: 5, name: "Buckskin Pass", coords: [-106.9700, 39.0800], elevationM: 3749, waypointType: "pass", description: "Final pass with sweeping views back to the Maroon Bells." },
      { sortOrder: 6, name: "Return to Maroon Lake", coords: [-106.9500, 39.0780], elevationM: 2926, waypointType: "end", description: "Complete the loop back at Maroon Lake." },
    ],
  },
  {
    slug: "uinta-highline-trail",
    name: "Uinta Highline Trail",
    description:
      "The Uinta Highline Trail traverses the Uinta Mountains in northeastern Utah—the only major east-west mountain range in the contiguous United States. The 104-mile trail follows the crest of the range, staying mostly above 10,000 feet with several passes above 12,500 feet.\n\nThe trail passes through vast alpine meadows, past hundreds of lakes, and beneath Kings Peak (13,534 ft), the highest point in Utah. The Uintas have a distinct character from other western ranges—the broad, rounded summits and extensive plateaus create a feeling of vast openness unlike the jagged peaks of the Tetons or Cascades.\n\nThe route is typically done west to east, starting at Hayden Pass and ending near Chepeta Lake. Water is abundant from lakes and streams. The terrain is generally less technical than other western high routes, making it accessible to fit hikers. Wildlife is abundant, including moose, elk, and mountain goats.",
    coordinates: [
      [-110.8800, 40.7100],
      [-110.7500, 40.7200],
      [-110.6000, 40.7300],
      [-110.4500, 40.7400],
      [-110.3000, 40.7500],
      [-110.1500, 40.7600],
      [-110.0000, 40.7700],
      [-109.8500, 40.7800],
    ],
    totalDistanceM: 167400,
    elevationGainM: 5486,
    elevationLossM: 5791,
    maxElevationM: 3810,
    minElevationM: 2926,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Uinta Mountains",
    state: "UT",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September. Snowfields linger on north aspects into August.",
    estimatedDays: 7.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Hayden Pass Trailhead",
    trailheadCoords: [-110.8800, 40.7100],
    isFeatured: false,
    metaTitle: "Uinta Highline Trail Thru-Hike Guide",
    metaDescription:
      "Plan the 104-mile Uinta Highline Trail in Utah. East-west mountain traverse, logistics, and tips.",
    waypoints: [
      { sortOrder: 1, name: "Hayden Pass", coords: [-110.8800, 40.7100], elevationM: 3260, waypointType: "start", description: "Western terminus at Hayden Pass on Mirror Lake Highway." },
      { sortOrder: 2, name: "Naturalist Basin", coords: [-110.6000, 40.7300], elevationM: 3200, waypointType: "camp", description: "Beautiful basin with numerous lakes. Good layover day option." },
      { sortOrder: 3, name: "Kings Peak Side Trail", coords: [-110.3000, 40.7500], elevationM: 3505, waypointType: "waypoint", description: "Junction for Kings Peak summit attempt. 4-mile side trip." },
      { sortOrder: 4, name: "Chepeta Lake", coords: [-109.8500, 40.7800], elevationM: 3109, waypointType: "end", description: "Eastern terminus at Chepeta Lake. Long dirt road to nearest town." },
    ],
  },
  {
    slug: "trinity-alps-traverse",
    name: "Trinity Alps Traverse",
    description:
      "The Trinity Alps in far northern California are one of the state's best-kept backpacking secrets. This traverse through the Trinity Alps Wilderness passes through granite peaks, alpine lakes, and dense old-growth forests with a fraction of the crowds found in the Sierra Nevada.\n\nThe route connects several trail systems to create a north-south traverse through the heart of the wilderness, passing pristine lakes including Caribou, Emerald, and Sapphire. The terrain has an alpine character similar to the Swiss Alps at a fraction of the elevation, with green meadows, glacier-carved cirques, and rushing streams.\n\nThe Trinity Alps see far less traffic than comparable California wilderness areas. Permits are free and self-issued at trailheads. Black bears are present—hang food or use canisters. Water quality is excellent from the many streams and lakes. The area is hot in midsummer; consider September for cooler temps and fall color.",
    coordinates: [
      [-122.8600, 41.0300],
      [-122.8400, 41.0200],
      [-122.8200, 41.0100],
      [-122.8000, 41.0000],
      [-122.7800, 40.9900],
      [-122.7600, 40.9800],
      [-122.7400, 40.9700],
    ],
    totalDistanceM: 56327,
    elevationGainM: 3048,
    elevationLossM: 3200,
    maxElevationM: 2530,
    minElevationM: 1067,
    activity: "backpacking",
    difficulty: "moderate",
    region: "Klamath Mountains",
    state: "CA",
    bestMonths: [6, 7, 8, 9, 10],
    seasonNotes: "June through October. Hot in midsummer; September is ideal.",
    estimatedDays: 4.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Stuart Fork Trailhead",
    trailheadCoords: [-122.8600, 41.0300],
    isFeatured: false,
    metaTitle: "Trinity Alps Traverse Backpacking",
    metaDescription:
      "Explore the Trinity Alps Wilderness in northern California. Route details and planning guide.",
    waypoints: [
      { sortOrder: 1, name: "Stuart Fork Trailhead", coords: [-122.8600, 41.0300], elevationM: 1067, waypointType: "start", description: "Begin at the Stuart Fork trailhead. Forested approach along the creek." },
      { sortOrder: 2, name: "Emerald Lake", coords: [-122.8200, 41.0100], elevationM: 1920, waypointType: "camp", description: "Beautiful emerald-green lake in a granite cirque. Excellent camping." },
      { sortOrder: 3, name: "Caribou Lakes Basin", coords: [-122.7800, 40.9900], elevationM: 2530, waypointType: "camp", description: "High basin with multiple lakes. Alpine wildflowers in July." },
      { sortOrder: 4, name: "Coffee Creek Trailhead", coords: [-122.7400, 40.9700], elevationM: 1220, waypointType: "end", description: "Exit at Coffee Creek. Arrange a shuttle back to start." },
    ],
  },
  {
    slug: "olympic-coast-route",
    name: "Olympic Coast Route",
    description:
      "The Olympic Coast in Washington State offers a unique wilderness beach backpacking experience. This route traverses the remote Pacific coastline of Olympic National Park, passing sea stacks, tide pools, and temperate rainforest headlands.\n\nThe route follows the beach for most of its length, with overland trail sections around impassable headlands. Timing with tides is essential—many beach sections are only passable at low tide. Rope-assisted headland crossings add a sense of adventure. Camp on the beach with the sound of the Pacific surf.\n\nPermit reservation is required for the most popular beach camps. Check tide tables carefully and carry a current tide chart. Weather is often rainy—waterproof everything. Despite the low elevation, this is a physically demanding route due to soft sand, tidal scrambles, and heavy pack requirements. Wildlife includes bald eagles, sea otters, and gray whales.",
    coordinates: [
      [-124.6300, 47.9130],
      [-124.6400, 47.8950],
      [-124.6500, 47.8750],
      [-124.6550, 47.8550],
      [-124.6600, 47.8350],
      [-124.6550, 47.8150],
      [-124.6350, 47.7950],
    ],
    totalDistanceM: 35400,
    elevationGainM: 610,
    elevationLossM: 610,
    maxElevationM: 91,
    minElevationM: 0,
    activity: "backpacking",
    difficulty: "moderate",
    region: "Olympic Peninsula",
    state: "WA",
    bestMonths: [6, 7, 8, 9],
    seasonNotes: "June through September for best weather. Accessible year-round but very wet in winter.",
    estimatedDays: 3.0,
    permitRequired: true,
    permitInfo: "Wilderness camping permit required from Olympic National Park. Reserve at recreation.gov.",
    trailheadName: "Rialto Beach",
    trailheadCoords: [-124.6300, 47.9130],
    isFeatured: false,
    metaTitle: "Olympic Coast Backpacking Route",
    metaDescription:
      "Wilderness beach backpacking on Washington's Olympic Coast. Tide info, permits, and route planning.",
    waypoints: [
      { sortOrder: 1, name: "Rialto Beach", coords: [-124.6300, 47.9130], elevationM: 3, waypointType: "start", description: "Start from Rialto Beach parking area near La Push." },
      { sortOrder: 2, name: "Chilean Memorial", coords: [-124.6400, 47.8950], elevationM: 5, waypointType: "waypoint", description: "Memorial to a Chilean ship wreck. Good camp spots nearby." },
      { sortOrder: 3, name: "Norwegian Memorial", coords: [-124.6550, 47.8550], elevationM: 15, waypointType: "camp", description: "Established beach camp. Tidal pools accessible at low tide." },
      { sortOrder: 4, name: "Sand Point", coords: [-124.6350, 47.7950], elevationM: 3, waypointType: "end", description: "Southern end of the route. Trail leads back to Ozette Lake trailhead." },
    ],
  },
  {
    slug: "sawtooth-traverse",
    name: "Sawtooth Traverse",
    description:
      "The Sawtooth Mountains in central Idaho are one of the most underrated alpine ranges in the American West. This traverse crosses the heart of the Sawtooth Wilderness, passing beneath jagged granite peaks that rival the Tetons in drama if not in height.\n\nThe route connects several lake basins via high passes, with options ranging from established trails to off-trail ridgeline walking. Key highlights include Redfish Lake, the alpine basins beneath Mt. Heyburn and the Grand Mogul, and the spectacular views from Baron Pass. The range has over 300 alpine lakes.\n\nThe Sawtooths see moderate traffic compared to more famous ranges. Free self-issue permits are available at trailheads. The town of Stanley provides resupply and shuttle services. Hot springs are scattered throughout the area, offering a welcome soak after long days on the trail.",
    coordinates: [
      [-115.1800, 44.1000],
      [-115.1700, 44.0900],
      [-115.1550, 44.0750],
      [-115.1400, 44.0600],
      [-115.1250, 44.0450],
      [-115.1100, 44.0300],
      [-115.0950, 44.0150],
    ],
    totalDistanceM: 56327,
    elevationGainM: 3200,
    elevationLossM: 3353,
    maxElevationM: 2926,
    minElevationM: 1980,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Sawtooth Range",
    state: "ID",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September. Snow on high passes into July.",
    estimatedDays: 5.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Redfish Lake Trailhead",
    trailheadCoords: [-115.1800, 44.1000],
    isFeatured: false,
    metaTitle: "Sawtooth Traverse Backpacking Guide",
    metaDescription:
      "Traverse Idaho's Sawtooth Mountains. Alpine lakes, granite peaks, and route planning guide.",
    waypoints: [
      { sortOrder: 1, name: "Redfish Lake", coords: [-115.1800, 44.1000], elevationM: 1980, waypointType: "start", description: "Begin at Redfish Lake. Water taxi available across the lake to save miles." },
      { sortOrder: 2, name: "Alpine Lake Basin", coords: [-115.1550, 44.0750], elevationM: 2590, waypointType: "camp", description: "Pristine lake basin surrounded by granite walls. Excellent camping." },
      { sortOrder: 3, name: "Baron Pass", coords: [-115.1400, 44.0600], elevationM: 2926, waypointType: "pass", description: "High pass with panoramic views of the entire Sawtooth Range." },
      { sortOrder: 4, name: "Grandjean Trailhead", coords: [-115.0950, 44.0150], elevationM: 1585, waypointType: "end", description: "Exit at Grandjean. Hot springs nearby for post-hike recovery." },
    ],
  },
  {
    slug: "wonderland-trail",
    name: "Wonderland Trail",
    description:
      "The Wonderland Trail is a 93-mile loop circumnavigating Mt. Rainier in Washington State. Considered one of the premier backpacking routes in the country, it gains and loses over 22,000 feet of elevation as it dips in and out of deep river valleys and crosses high alpine meadows.\n\nThe trail passes through every ecological zone on the mountain, from old-growth forest to subalpine meadows to glacial moraines. Wildflower displays in late July and August are legendary. The route crosses numerous glacial rivers and passes through some of the most spectacular alpine scenery in the Cascades.\n\nPermits are required and allocated through a competitive lottery. Most hikers take 8-12 days. Camps are spaced at reasonable intervals but are designated—no dispersed camping. Weather can be highly variable; be prepared for rain at any time. The trail is well-maintained but physically demanding due to the cumulative elevation change.",
    coordinates: [
      [-121.7570, 46.7480],
      [-121.7800, 46.7700],
      [-121.8100, 46.7900],
      [-121.8400, 46.8100],
      [-121.8500, 46.8400],
      [-121.8300, 46.8600],
      [-121.7900, 46.8700],
      [-121.7500, 46.8600],
      [-121.7200, 46.8400],
      [-121.7100, 46.8100],
      [-121.7200, 46.7800],
      [-121.7570, 46.7480],
    ],
    totalDistanceM: 149669,
    elevationGainM: 6706,
    elevationLossM: 6706,
    maxElevationM: 1981,
    minElevationM: 595,
    activity: "backpacking",
    difficulty: "strenuous",
    region: "Cascades",
    state: "WA",
    bestMonths: [7, 8, 9],
    seasonNotes: "Late July through September. Snow on northern passes into August.",
    estimatedDays: 10.0,
    permitRequired: true,
    permitInfo: "Wilderness camping permit required through recreation.gov lottery. Apply in March.",
    trailheadName: "Longmire",
    trailheadCoords: [-121.7570, 46.7480],
    isFeatured: true,
    metaTitle: "Wonderland Trail Backpacking Guide",
    metaDescription:
      "Plan your Wonderland Trail hike around Mt. Rainier. 93-mile loop, permits, and conditions.",
    waypoints: [
      { sortOrder: 1, name: "Longmire", coords: [-121.7570, 46.7480], elevationM: 841, waypointType: "start", description: "Classic starting point at Longmire. Ranger station and permits." },
      { sortOrder: 2, name: "Indian Bar", coords: [-121.7200, 46.8400], elevationM: 1707, waypointType: "camp", description: "One of the most scenic camps. Alpine meadows and waterfall views." },
      { sortOrder: 3, name: "Sunrise Camp", coords: [-121.7500, 46.8600], elevationM: 1920, waypointType: "camp", description: "Near Sunrise visitor area. Highest camp on the trail." },
      { sortOrder: 4, name: "Carbon River Camp", coords: [-121.8300, 46.8600], elevationM: 1067, waypointType: "camp", description: "Deep in the Carbon River valley. Old-growth forest." },
      { sortOrder: 5, name: "Return to Longmire", coords: [-121.7570, 46.7480], elevationM: 841, waypointType: "end", description: "Complete the loop back at Longmire." },
    ],
  },
  {
    slug: "lost-coast-trail",
    name: "Lost Coast Trail",
    description:
      "The Lost Coast Trail traverses California's most remote and undeveloped coastline, where the King Range meets the Pacific Ocean. The 25-mile trail follows the beach and coastal bluffs through terrain so rugged that Highway 1 was forced inland, leaving this stretch \"lost\" to development.\n\nThe northern section is a true beach hike, navigating around rocky headlands that require tidal timing. The southern section climbs through coastal grasslands and forests. Sea lions, elephant seals, and migrating whales are common sights. The black sand beaches and dramatic sea stacks create an otherworldly landscape.\n\nPermits are required and limited to control impact. Creek crossings can be difficult in winter. The northern beach section is only passable at low tide—carry a tide chart and plan accordingly. Weather is foggy and cool even in summer. Water sources are limited between creeks; carry at least 2 liters between sources.",
    coordinates: [
      [-124.0680, 40.4420],
      [-124.0730, 40.4270],
      [-124.0780, 40.4120],
      [-124.0820, 40.3970],
      [-124.0850, 40.3820],
      [-124.0870, 40.3670],
      [-124.0680, 40.3520],
      [-124.0580, 40.3370],
    ],
    totalDistanceM: 40234,
    elevationGainM: 1219,
    elevationLossM: 1280,
    maxElevationM: 366,
    minElevationM: 0,
    activity: "backpacking",
    difficulty: "moderate",
    region: "King Range",
    state: "CA",
    bestMonths: [5, 6, 7, 8, 9, 10],
    seasonNotes: "May through October. Foggy and cool year-round. Winter storms make beach impassable.",
    estimatedDays: 3.0,
    permitRequired: true,
    permitInfo: "Bear canister and permit required from BLM King Range office. Reserve at recreation.gov.",
    trailheadName: "Mattole Beach",
    trailheadCoords: [-124.0680, 40.4420],
    isFeatured: false,
    metaTitle: "Lost Coast Trail Backpacking Guide",
    metaDescription:
      "Hike California's Lost Coast Trail. Tide info, permits, and route planning for this remote beach trek.",
    waypoints: [
      { sortOrder: 1, name: "Mattole Beach", coords: [-124.0680, 40.4420], elevationM: 3, waypointType: "start", description: "Northern trailhead at Mattole Beach. Check tides before departing." },
      { sortOrder: 2, name: "Punta Gorda Lighthouse", coords: [-124.0730, 40.4270], elevationM: 10, waypointType: "waypoint", description: "Historic lighthouse ruins. Rocky headland requires low tide to pass." },
      { sortOrder: 3, name: "Big Flat Camp", coords: [-124.0820, 40.3970], elevationM: 5, waypointType: "camp", description: "Popular beach camping area. Reliable water from Spanish Creek." },
      { sortOrder: 4, name: "Black Sands Beach", coords: [-124.0580, 40.3370], elevationM: 3, waypointType: "end", description: "Southern terminus at Black Sands Beach near Shelter Cove." },
    ],
  },
];

const MOUNTAINEERING_ROUTES: RouteInput[] = [
  {
    slug: "grand-teton-owen-spalding",
    name: "Grand Teton – Owen-Spalding Route",
    description:
      "The Owen-Spalding route is the most popular climbing route on the Grand Teton (13,775 ft), the iconic peak that dominates the Jackson Hole skyline. This classic mountaineering route involves sustained scrambling, a few moves of low 5th class climbing, and significant exposure.\n\nThe approach follows the standard Garnet Canyon trail to the Lower Saddle at 11,600 feet, where most parties bivy for the night. From the saddle, the route climbs through the Black Dike, traverses the Upper Saddle, and ascends the Owen-Spalding couloir to the summit ridge. The final moves to the summit involve exposed scrambling.\n\nThe route requires basic rock climbing skills, comfort with exposure, and excellent fitness. Most parties hire a guide for their first ascent. A climbing permit is required. Start from the Lower Saddle before dawn to avoid afternoon storms and to have the mountain to yourself.",
    coordinates: [
      [-110.7730, 43.7370],
      [-110.7780, 43.7390],
      [-110.7820, 43.7410],
      [-110.7860, 43.7420],
      [-110.7900, 43.7430],
      [-110.8020, 43.7410],
    ],
    totalDistanceM: 20921,
    elevationGainM: 2134,
    elevationLossM: 2134,
    maxElevationM: 4199,
    minElevationM: 2073,
    activity: "mountaineering",
    difficulty: "strenuous",
    region: "Tetons",
    state: "WY",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September. Route may hold snow early season.",
    estimatedDays: 2.0,
    permitRequired: true,
    permitInfo: "Climbing permit required from Grand Teton National Park. Register at Jenny Lake Ranger Station.",
    trailheadName: "Lupine Meadows",
    trailheadCoords: [-110.7730, 43.7370],
    isFeatured: true,
    metaTitle: "Grand Teton Owen-Spalding Climbing Route",
    metaDescription:
      "Climb the Grand Teton via the Owen-Spalding route. Technical details, permits, and conditions.",
    waypoints: [
      { sortOrder: 1, name: "Lupine Meadows Trailhead", coords: [-110.7730, 43.7370], elevationM: 2073, waypointType: "start", description: "Main trailhead. Start well before dawn on summit day." },
      { sortOrder: 2, name: "Garnet Canyon Meadows", coords: [-110.7780, 43.7390], elevationM: 2896, waypointType: "waypoint", description: "Meadows in Garnet Canyon. Trail steepens significantly above here." },
      { sortOrder: 3, name: "Lower Saddle Bivy", coords: [-110.7860, 43.7420], elevationM: 3536, waypointType: "camp", description: "Bivy site at the Lower Saddle. Cramped platforms with incredible views." },
      { sortOrder: 4, name: "Upper Saddle", coords: [-110.7900, 43.7430], elevationM: 3962, waypointType: "waypoint", description: "Base of the Owen-Spalding route proper. Rope up here." },
      { sortOrder: 5, name: "Grand Teton Summit", coords: [-110.8020, 43.7410], elevationM: 4199, waypointType: "summit", description: "Summit at 13,775 ft. Sign the summit register. Descend same route." },
    ],
  },
  {
    slug: "mt-rainier-disappointment-cleaver",
    name: "Mt. Rainier – Disappointment Cleaver",
    description:
      "Disappointment Cleaver is the most popular climbing route on Mt. Rainier (14,411 ft), the most heavily glaciated peak in the contiguous United States. The route ascends through alpine meadows, crosses the Muir Snowfield, and weaves between massive crevasses on the Ingraham Glacier.\n\nThe standard itinerary stages at Camp Muir (10,080 ft) on day one, then departs around midnight for the summit push. The route crosses the Ingraham Glacier, climbs the rocky Disappointment Cleaver, and continues up the upper mountain through a maze of crevasses. Rope travel and glacier skills are essential.\n\nMt. Rainier is a serious mountaineering objective with a roughly 50% summit rate. Altitude sickness, crevasse falls, and severe weather are real risks. Most parties use a guide service. Physical preparation should include months of stair climbing with a weighted pack. Climbing permits and camping fees are required.",
    coordinates: [
      [-121.7315, 46.7863],
      [-121.7330, 46.7900],
      [-121.7350, 46.7950],
      [-121.7370, 46.8000],
      [-121.7390, 46.8050],
      [-121.7570, 46.8530],
    ],
    totalDistanceM: 25750,
    elevationGainM: 2820,
    elevationLossM: 2820,
    maxElevationM: 4392,
    minElevationM: 1631,
    activity: "mountaineering",
    difficulty: "strenuous",
    region: "Cascades",
    state: "WA",
    bestMonths: [5, 6, 7, 8, 9],
    seasonNotes: "May through September. Best weather windows June-August.",
    estimatedDays: 2.0,
    permitRequired: true,
    permitInfo: "Climbing permit and recreation fee required. Reserve at recreation.gov or obtain at Paradise ranger station.",
    trailheadName: "Paradise",
    trailheadCoords: [-121.7315, 46.7863],
    isFeatured: true,
    metaTitle: "Mt. Rainier Disappointment Cleaver Route",
    metaDescription:
      "Climb Mt. Rainier via the Disappointment Cleaver. Route details, permits, and training guide.",
    waypoints: [
      { sortOrder: 1, name: "Paradise Trailhead", coords: [-121.7315, 46.7863], elevationM: 1631, waypointType: "start", description: "Start from the Paradise area. Ranger station for permits." },
      { sortOrder: 2, name: "Camp Muir", coords: [-121.7350, 46.7950], elevationM: 3072, waypointType: "camp", description: "High camp at 10,080 ft. Public shelter and camping platforms." },
      { sortOrder: 3, name: "Ingraham Flats", coords: [-121.7370, 46.8000], elevationM: 3353, waypointType: "camp", description: "Alternative high camp. Rope up for glacier travel from here." },
      { sortOrder: 4, name: "Disappointment Cleaver", coords: [-121.7390, 46.8050], elevationM: 3810, waypointType: "waypoint", description: "Rocky ridge between Ingraham and Emmons Glaciers. Crux of the route." },
      { sortOrder: 5, name: "Mt. Rainier Summit", coords: [-121.7570, 46.8530], elevationM: 4392, waypointType: "summit", description: "Columbia Crest, the true summit at 14,411 ft. Crater rim views." },
    ],
  },
  {
    slug: "mt-shasta-avalanche-gulch",
    name: "Mt. Shasta – Avalanche Gulch",
    description:
      "Avalanche Gulch is the standard climbing route on Mt. Shasta (14,179 ft), a massive volcanic peak in northern California. The route is a non-technical snow climb but requires crampons, an ice axe, and self-arrest skills. The sheer vertical gain—over 7,000 feet from trailhead to summit—makes it one of the most demanding day climbs in the lower 48.\n\nThe route ascends from Bunny Flat through the Sierra Club hut area, past Helen Lake (a common high camp), and up the steepening Avalanche Gulch to the Red Banks—a band of volcanic rock at 13,000 feet. Above the Red Banks, the route traverses Misery Hill before the final push to the summit.\n\nAlpine starts (1-2 AM) are essential to catch firm snow and avoid rockfall in the gulch. The mountain creates its own weather and can go from sunny to whiteout in minutes. A summit pass and wilderness permit are required. Wag bags are mandatory for human waste above treeline.",
    coordinates: [
      [-122.2330, 41.3550],
      [-122.2300, 41.3600],
      [-122.2270, 41.3650],
      [-122.2240, 41.3700],
      [-122.2210, 41.3750],
      [-122.1950, 41.4095],
    ],
    totalDistanceM: 18507,
    elevationGainM: 2286,
    elevationLossM: 2286,
    maxElevationM: 4322,
    minElevationM: 2070,
    activity: "mountaineering",
    difficulty: "strenuous",
    region: "Cascades",
    state: "CA",
    bestMonths: [5, 6, 7],
    seasonNotes: "May through July for best snow conditions. Later season is loose scree.",
    estimatedDays: 2.0,
    permitRequired: true,
    permitInfo: "Summit pass ($25) and wilderness permit required. Available online or at the ranger station in Mt. Shasta city.",
    trailheadName: "Bunny Flat",
    trailheadCoords: [-122.2330, 41.3550],
    isFeatured: false,
    metaTitle: "Mt. Shasta Avalanche Gulch Route",
    metaDescription:
      "Climb Mt. Shasta via Avalanche Gulch. Route guide, permits, and conditions information.",
    waypoints: [
      { sortOrder: 1, name: "Bunny Flat Trailhead", coords: [-122.2330, 41.3550], elevationM: 2070, waypointType: "start", description: "Trailhead at Bunny Flat. Self-register for permits here." },
      { sortOrder: 2, name: "Horse Camp / Sierra Club Hut", coords: [-122.2300, 41.3600], elevationM: 2438, waypointType: "camp", description: "Historic stone hut. Spring water available. Good acclimatization camp." },
      { sortOrder: 3, name: "Helen Lake", coords: [-122.2240, 41.3700], elevationM: 3109, waypointType: "camp", description: "High camp at Helen Lake. Snow camping on the glacier." },
      { sortOrder: 4, name: "Red Banks", coords: [-122.2210, 41.3750], elevationM: 3962, waypointType: "waypoint", description: "Volcanic rock band. Crux of the route. Bergschrund crossing early season." },
      { sortOrder: 5, name: "Mt. Shasta Summit", coords: [-122.1950, 41.4095], elevationM: 4322, waypointType: "summit", description: "Summit at 14,179 ft. Sulfurous fumaroles near the top." },
    ],
  },
  {
    slug: "longs-peak-keyhole",
    name: "Longs Peak – Keyhole Route",
    description:
      "The Keyhole Route on Longs Peak (14,259 ft) is Colorado's most iconic mountaineering route and the only 14er in Rocky Mountain National Park. The route combines a long approach with exposed scrambling through a series of named features: the Ledges, the Trough, the Narrows, and the Homestretch.\n\nStarting from the Longs Peak Trailhead at 9,400 feet, the approach hikes through subalpine forest and alpine tundra to the Boulder Field at 12,750 feet. From there, the Keyhole—a gap in the rock wall—marks the transition to the technical terrain. Each subsequent section increases in difficulty and exposure.\n\nThe route should be attempted only in good weather. Lightning is the primary hazard; aim to summit by noon and be off the exposed rock by early afternoon. The Homestretch—a steep slab leading to the summit—is the most dangerous section. In early season, snow and ice on the route require crampons and an ice axe.",
    coordinates: [
      [-105.5570, 40.2550],
      [-105.5600, 40.2600],
      [-105.5650, 40.2650],
      [-105.5700, 40.2700],
      [-105.5750, 40.2730],
      [-105.6153, 40.2550],
    ],
    totalDistanceM: 24140,
    elevationGainM: 1524,
    elevationLossM: 1524,
    maxElevationM: 4346,
    minElevationM: 2865,
    activity: "mountaineering",
    difficulty: "strenuous",
    region: "Front Range",
    state: "CO",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September for rock route. Earlier requires snow gear.",
    estimatedDays: 1.0,
    permitRequired: true,
    permitInfo: "Permit required May 1-Oct 15 from recreation.gov. Lottery for peak season dates.",
    trailheadName: "Longs Peak Trailhead",
    trailheadCoords: [-105.5570, 40.2550],
    isFeatured: false,
    metaTitle: "Longs Peak Keyhole Route Guide",
    metaDescription:
      "Climb Longs Peak via the Keyhole Route in RMNP. Route details, weather, and permit info.",
    waypoints: [
      { sortOrder: 1, name: "Longs Peak Trailhead", coords: [-105.5570, 40.2550], elevationM: 2865, waypointType: "start", description: "Start before 3 AM to summit by noon. Headlamp required." },
      { sortOrder: 2, name: "Boulder Field", coords: [-105.5650, 40.2650], elevationM: 3886, waypointType: "waypoint", description: "Large boulder field. Last sheltered area before exposed terrain." },
      { sortOrder: 3, name: "The Keyhole", coords: [-105.5700, 40.2700], elevationM: 4023, waypointType: "pass", description: "Iconic gap in the rock wall. Bull's-eye painted markers begin here." },
      { sortOrder: 4, name: "The Narrows", coords: [-105.5750, 40.2730], elevationM: 4200, waypointType: "waypoint", description: "Exposed ledge traverse. Most committing section of the route." },
      { sortOrder: 5, name: "Longs Peak Summit", coords: [-105.6153, 40.2550], elevationM: 4346, waypointType: "summit", description: "Flat summit at 14,259 ft. Dramatic views of Rocky Mountain NP." },
    ],
  },
  {
    slug: "capitol-peak",
    name: "Capitol Peak",
    description:
      "Capitol Peak (14,130 ft) is widely considered the most difficult and dangerous of Colorado's 14,000-foot peaks. The famous Knife Edge—a narrow rock ridge with sheer drops on both sides—is the crux of the route and one of the most exposed sections of scrambling on any standard 14er route.\n\nThe approach from Capitol Creek trailhead follows a beautiful valley past Capitol Lake to a high camp below the peak. The summit route traverses K2 (a sub-summit), crosses the Knife Edge, and scrambles up the final summit block. The rock is solid Maroon Bells quartzite but the exposure is extreme.\n\nThis route demands excellent scrambling skills, a head for heights, and perfect weather. The Knife Edge is about 150 feet long and only a few feet wide with 1,000-foot drops on either side. Several fatalities have occurred here. Do not attempt in wet, icy, or stormy conditions. There is no margin for error.",
    coordinates: [
      [-107.0830, 39.1530],
      [-107.0800, 39.1500],
      [-107.0750, 39.1450],
      [-107.0700, 39.1400],
      [-107.0650, 39.1350],
      [-107.0830, 39.1500],
    ],
    totalDistanceM: 27359,
    elevationGainM: 1585,
    elevationLossM: 1585,
    maxElevationM: 4307,
    minElevationM: 2896,
    activity: "mountaineering",
    difficulty: "expert",
    region: "Elk Mountains",
    state: "CO",
    bestMonths: [7, 8, 9],
    seasonNotes: "July through September for dry rock. Conditions deteriorate rapidly with weather.",
    estimatedDays: 2.0,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Capitol Creek Trailhead",
    trailheadCoords: [-107.0830, 39.1530],
    isFeatured: false,
    metaTitle: "Capitol Peak Climbing Guide",
    metaDescription:
      "Climb Capitol Peak, Colorado's most difficult 14er. Knife Edge details, route planning, and safety.",
    waypoints: [
      { sortOrder: 1, name: "Capitol Creek Trailhead", coords: [-107.0830, 39.1530], elevationM: 2896, waypointType: "start", description: "Start from Capitol Creek trailhead. Dirt road access." },
      { sortOrder: 2, name: "Capitol Lake Camp", coords: [-107.0750, 39.1450], elevationM: 3505, waypointType: "camp", description: "High camp at Capitol Lake. Stunning setting beneath the peak." },
      { sortOrder: 3, name: "K2 Sub-summit", coords: [-107.0700, 39.1400], elevationM: 4200, waypointType: "waypoint", description: "Sub-peak before the Knife Edge. Last spot to reassess conditions." },
      { sortOrder: 4, name: "The Knife Edge", coords: [-107.0650, 39.1350], elevationM: 4267, waypointType: "waypoint", description: "150-foot exposed ridge. The crux—straddle or walk depending on comfort." },
      { sortOrder: 5, name: "Capitol Peak Summit", coords: [-107.0830, 39.1500], elevationM: 4307, waypointType: "summit", description: "Summit of Capitol Peak at 14,130 ft. Return the same way." },
    ],
  },
  {
    slug: "mt-whitney-mountaineers-route",
    name: "Mt. Whitney – Mountaineers Route",
    description:
      "The Mountaineers Route on Mt. Whitney (14,505 ft) is a classic alpine climb up the east face, offering a more adventurous alternative to the crowded main trail. The route ascends a steep couloir that holds snow from autumn through early summer, requiring ice axe, crampons, and self-arrest proficiency.\n\nThe approach starts from Whitney Portal and ascends through the North Fork of Lone Pine Creek to Iceberg Lake at 12,600 feet. From the lake, the route climbs the prominent couloir on the east face—2,000 feet of sustained 35-45 degree snow or scree depending on season. The route tops out near the summit and a short scramble reaches the highest point.\n\nEarly season (April-June) with consolidated snow is preferred over the late season loose scree nightmare. Rockfall is a significant hazard, especially in the afternoon when the sun softens the snow. An alpine start is mandatory. The route is more demanding than the standard trail and should only be attempted by experienced mountaineers.",
    coordinates: [
      [-118.2400, 36.5870],
      [-118.2500, 36.5830],
      [-118.2600, 36.5790],
      [-118.2700, 36.5760],
      [-118.2800, 36.5780],
      [-118.2920, 36.5786],
    ],
    totalDistanceM: 16093,
    elevationGainM: 1981,
    elevationLossM: 1981,
    maxElevationM: 4421,
    minElevationM: 2550,
    activity: "mountaineering",
    difficulty: "expert",
    region: "Sierra Nevada",
    state: "CA",
    bestMonths: [4, 5, 6],
    seasonNotes: "April through June for consolidated snow. Late season becomes loose, dangerous scree.",
    estimatedDays: 2.0,
    permitRequired: true,
    permitInfo: "Mt. Whitney Zone permit required year-round. Lottery through recreation.gov.",
    trailheadName: "Whitney Portal",
    trailheadCoords: [-118.2400, 36.5870],
    isFeatured: false,
    metaTitle: "Mt. Whitney Mountaineers Route Guide",
    metaDescription:
      "Climb Mt. Whitney via the Mountaineers Route. East face couloir, snow conditions, and permits.",
    waypoints: [
      { sortOrder: 1, name: "Whitney Portal", coords: [-118.2400, 36.5870], elevationM: 2550, waypointType: "start", description: "Start from Whitney Portal campground. Pack ice axe and crampons." },
      { sortOrder: 2, name: "Lower Boy Scout Lake", coords: [-118.2500, 36.5830], elevationM: 3170, waypointType: "camp", description: "Lower camp option. More sheltered than Iceberg Lake." },
      { sortOrder: 3, name: "Iceberg Lake", coords: [-118.2700, 36.5760], elevationM: 3840, waypointType: "camp", description: "High camp at base of the east face couloir. Frozen into June." },
      { sortOrder: 4, name: "East Face Couloir Top", coords: [-118.2800, 36.5780], elevationM: 4300, waypointType: "pass", description: "Top of the couloir. Short scramble to summit from here." },
      { sortOrder: 5, name: "Mt. Whitney Summit", coords: [-118.2920, 36.5786], elevationM: 4421, waypointType: "summit", description: "Highest point in the lower 48 at 14,505 ft. Summit hut." },
    ],
  },
];

const TRAIL_RUNNING_ROUTES: RouteInput[] = [
  {
    slug: "wasatch-100-course",
    name: "Wasatch 100 Course",
    description:
      "The Wasatch Front 100 is one of the original mountain ultra-races, traversing the Wasatch Range above Salt Lake City over 100 miles with over 26,000 feet of climbing. The course follows ridgelines, canyons, and ski resort trails through some of Utah's most rugged terrain.\n\nStarting in East Layton, the course heads south along the Wasatch crest, passing through Big Mountain, Lambs Canyon, Millcreek Canyon, and Brighton before finishing at Soldier Hollow near Midway. The terrain is relentlessly technical with rocky singletrack, steep climbs, and quad-destroying descents.\n\nThis is one of the hardest 100-mile races in the US, with a roughly 50% finish rate. Runners have 36 hours to complete the course. The route is typically run as a supported race in September, but can be attempted as a fastpack at other times. Much of the route follows the Great Wasatch Trail.",
    coordinates: [
      [-111.7700, 40.9750],
      [-111.7500, 40.9500],
      [-111.7300, 40.9200],
      [-111.7100, 40.8900],
      [-111.6900, 40.8600],
      [-111.6700, 40.8300],
      [-111.6500, 40.8000],
      [-111.6300, 40.7700],
      [-111.6100, 40.7400],
      [-111.5900, 40.7100],
      [-111.5100, 40.5200],
    ],
    totalDistanceM: 161000,
    elevationGainM: 7925,
    elevationLossM: 8230,
    maxElevationM: 3109,
    minElevationM: 1524,
    activity: "trail_running",
    difficulty: "expert",
    region: "Wasatch",
    state: "UT",
    bestMonths: [7, 8, 9, 10],
    seasonNotes: "Race held in September. Course runnable July through October.",
    estimatedDays: 1.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "East Layton Park",
    trailheadCoords: [-111.7700, 40.9750],
    isFeatured: false,
    metaTitle: "Wasatch 100 Trail Running Course",
    metaDescription:
      "Run the Wasatch 100 course in Utah. 100 miles, 26,000 ft of climbing, route details.",
    waypoints: [
      { sortOrder: 1, name: "East Layton Start", coords: [-111.7700, 40.9750], elevationM: 1524, waypointType: "start", description: "Northern terminus. Race starts here at 5 AM." },
      { sortOrder: 2, name: "Big Mountain Pass", coords: [-111.7100, 40.8900], elevationM: 2652, waypointType: "pass", description: "Major aid station at Big Mountain. About 30 miles in." },
      { sortOrder: 3, name: "Brighton Ski Resort", coords: [-111.6500, 40.8000], elevationM: 2682, waypointType: "waypoint", description: "Midpoint of the course. Drop bag access." },
      { sortOrder: 4, name: "Soldier Hollow Finish", coords: [-111.5100, 40.5200], elevationM: 1707, waypointType: "end", description: "Finish line at Soldier Hollow near Midway. 36-hour cutoff." },
    ],
  },
  {
    slug: "leadville-100-course",
    name: "Leadville 100 Course",
    description:
      "The Leadville Trail 100 is America's most famous mountain ultramarathon, an out-and-back course through the Colorado Rockies at extreme altitude. The entire course stays above 9,200 feet, with the high point at Hope Pass (12,600 ft) crossed twice—once in each direction.\n\nStarting and finishing in historic Leadville (10,152 ft), the course traverses the Sawatch Range through a mix of mining roads, singletrack, and river valleys. The Twin Lakes section, the climb over Hope Pass, and the exposed ridgeline to Winfield turnaround are the signature sections.\n\nThe altitude is the defining challenge. Even elite runners slow dramatically above 12,000 feet. The 30-hour cutoff is generous by some standards but the altitude makes it brutally selective. Night running through the Colorado mountains adds another dimension. The race has been held since 1983 and is one of the original American ultras.",
    coordinates: [
      [-106.2920, 39.2480],
      [-106.3200, 39.2400],
      [-106.3500, 39.2200],
      [-106.3800, 39.2000],
      [-106.4100, 39.1800],
      [-106.4400, 39.1600],
      [-106.4100, 39.1800],
      [-106.3800, 39.2000],
      [-106.3500, 39.2200],
      [-106.3200, 39.2400],
      [-106.2920, 39.2480],
    ],
    totalDistanceM: 161000,
    elevationGainM: 4800,
    elevationLossM: 4800,
    maxElevationM: 3840,
    minElevationM: 2804,
    activity: "trail_running",
    difficulty: "expert",
    region: "Sawatch Range",
    state: "CO",
    bestMonths: [7, 8],
    seasonNotes: "Race held in August. Course runnable July-September at altitude.",
    estimatedDays: 1.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "Leadville, 6th Street",
    trailheadCoords: [-106.2920, 39.2480],
    isFeatured: false,
    metaTitle: "Leadville 100 Trail Running Course",
    metaDescription:
      "Run the Leadville 100 in Colorado's Rockies. Extreme altitude, Hope Pass, and race planning.",
    waypoints: [
      { sortOrder: 1, name: "Leadville Start/Finish", coords: [-106.2920, 39.2480], elevationM: 3094, waypointType: "start", description: "Historic 6th Street in Leadville. Race begins at 4 AM." },
      { sortOrder: 2, name: "Twin Lakes", coords: [-106.3500, 39.2200], elevationM: 2804, waypointType: "waypoint", description: "Major aid station at Twin Lakes. Pacer pickup point outbound." },
      { sortOrder: 3, name: "Hope Pass Summit", coords: [-106.4100, 39.1800], elevationM: 3840, waypointType: "pass", description: "High point at 12,600 ft. The crux of the course, crossed twice." },
      { sortOrder: 4, name: "Winfield Turnaround", coords: [-106.4400, 39.1600], elevationM: 3048, waypointType: "waypoint", description: "Ghost town of Winfield. Turnaround point for the out-and-back." },
    ],
  },
  {
    slug: "grand-canyon-r2r",
    name: "Grand Canyon Rim-to-Rim",
    description:
      "The Grand Canyon Rim-to-Rim (R2R) is one of America's most iconic trail running challenges—crossing the Grand Canyon from the North Rim to the South Rim (or vice versa) in a single push. The 24-mile route descends 5,850 feet to the Colorado River, then climbs 4,380 feet to the opposite rim.\n\nMost runners go South to North via the Bright Angel Trail down and the North Kaibab Trail up, though the reverse is also popular. The run crosses through five climate zones, from ponderosa pine forest at the rims through desert scrub at the river. The inner canyon can be brutally hot in summer, with temperatures exceeding 110°F at Phantom Ranch.\n\nSpring and fall are the optimal seasons. Carry more water than you think you need—at least 3 liters with refill points at Phantom Ranch and Cottonwood. The NPS discourages rim-to-rim day hikes in summer due to heat-related deaths. The R2R2R (rim-to-rim-to-rim) doubles the challenge at 48 miles.",
    coordinates: [
      [-112.0880, 36.0570],
      [-112.0950, 36.0650],
      [-112.0990, 36.0800],
      [-112.1020, 36.0950],
      [-112.0960, 36.1200],
      [-112.0570, 36.2180],
    ],
    totalDistanceM: 38624,
    elevationGainM: 1524,
    elevationLossM: 1782,
    maxElevationM: 2512,
    minElevationM: 732,
    activity: "trail_running",
    difficulty: "strenuous",
    region: "Grand Canyon",
    state: "AZ",
    bestMonths: [3, 4, 5, 10, 11],
    seasonNotes: "Spring and fall ideal. Avoid June-August due to extreme inner canyon heat.",
    estimatedDays: 0.5,
    permitRequired: false,
    permitInfo: null,
    trailheadName: "South Kaibab Trailhead",
    trailheadCoords: [-112.0880, 36.0570],
    isFeatured: true,
    metaTitle: "Grand Canyon Rim-to-Rim Running Guide",
    metaDescription:
      "Run the Grand Canyon Rim-to-Rim. Route planning, water sources, heat management, and logistics.",
    waypoints: [
      { sortOrder: 1, name: "South Kaibab Trailhead", coords: [-112.0880, 36.0570], elevationM: 2195, waypointType: "start", description: "Start from the South Rim. Take the shuttle to the trailhead." },
      { sortOrder: 2, name: "Phantom Ranch", coords: [-112.0990, 36.0800], elevationM: 732, waypointType: "water", description: "Refill water at Phantom Ranch canteen. Only guaranteed water in the canyon." },
      { sortOrder: 3, name: "Cottonwood Campground", coords: [-112.0960, 36.1200], elevationM: 1219, waypointType: "water", description: "Water and restrooms. About 7 miles from the North Rim." },
      { sortOrder: 4, name: "North Kaibab Trailhead", coords: [-112.0570, 36.2180], elevationM: 2512, waypointType: "end", description: "North Rim finish. Arrange shuttle or have car positioned." },
    ],
  },
  {
    slug: "zion-traverse",
    name: "Zion Traverse",
    description:
      "The Zion Traverse is a top-to-bottom run through Zion National Park, covering approximately 48 miles from the Kolob Terrace to the park's south entrance. The route connects backcountry trails to create a tour of Zion's most spectacular landscapes, from high plateaus to deep sandstone canyons.\n\nThe traverse follows the Hop Valley Trail, Wildcat Canyon, the West Rim Trail, and Angels Landing before descending into Zion Canyon. The West Rim section offers jaw-dropping views of the main canyon, and the descent past Angels Landing is one of the most scenic sections of trail anywhere in the national park system.\n\nMost runners complete the traverse in 8-14 hours. Water is the primary logistical challenge—carry at least 3 liters and know where seasonal sources are. The route drops from pine forests at 7,500 feet to desert at 4,000 feet. Spring and fall are ideal; summer is dangerously hot in the lower elevations.",
    coordinates: [
      [-113.0480, 37.3750],
      [-113.0400, 37.3600],
      [-113.0300, 37.3400],
      [-113.0200, 37.3200],
      [-113.0100, 37.3000],
      [-113.0000, 37.2850],
      [-112.9800, 37.2700],
      [-112.9500, 37.2000],
    ],
    totalDistanceM: 77249,
    elevationGainM: 1524,
    elevationLossM: 2743,
    maxElevationM: 2286,
    minElevationM: 1219,
    activity: "trail_running",
    difficulty: "strenuous",
    region: "Zion",
    state: "UT",
    bestMonths: [3, 4, 5, 10, 11],
    seasonNotes: "Spring and fall ideal. Summer too hot in the canyon. Winter snow at higher elevations.",
    estimatedDays: 0.5,
    permitRequired: true,
    permitInfo: "Wilderness permit required for overnight. Day-use through-hikers need no permit but check current regulations.",
    trailheadName: "Lee Pass / Kolob Terrace",
    trailheadCoords: [-113.0480, 37.3750],
    isFeatured: false,
    metaTitle: "Zion Traverse Trail Running Guide",
    metaDescription:
      "Run the 48-mile Zion Traverse through Zion National Park. Route planning, water, and logistics.",
    waypoints: [
      { sortOrder: 1, name: "Lee Pass Trailhead", coords: [-113.0480, 37.3750], elevationM: 1890, waypointType: "start", description: "Start from Lee Pass on the Kolob Terrace road." },
      { sortOrder: 2, name: "Hop Valley Junction", coords: [-113.0300, 37.3400], elevationM: 1920, waypointType: "waypoint", description: "Trail junction in Hop Valley. Sandy terrain through here." },
      { sortOrder: 3, name: "West Rim Viewpoint", coords: [-113.0000, 37.2850], elevationM: 2286, waypointType: "waypoint", description: "Stunning overlook of the main Zion Canyon. Angels Landing visible below." },
      { sortOrder: 4, name: "Grotto Trailhead", coords: [-112.9500, 37.2000], elevationM: 1219, waypointType: "end", description: "Finish at the Grotto shuttle stop in Zion Canyon." },
    ],
  },
];

const ALL_ROUTES: RouteInput[] = [
  ...SKI_TOURING_ROUTES,
  ...BACKPACKING_ROUTES,
  ...MOUNTAINEERING_ROUTES,
  ...TRAIL_RUNNING_ROUTES,
];

// ── Seed Logic ──────────────────────────────────────────────────────────

function toLineStringWKT(coords: number[][]): string {
  return `SRID=4326;LINESTRING(${coords.map((c) => `${c[0]} ${c[1]}`).join(",")})`;
}

function toPointWKT(coords: [number, number]): string {
  return `SRID=4326;POINT(${coords[0]} ${coords[1]})`;
}

async function seedRoutes(sql: postgres.Sql): Promise<void> {
  console.log("\n╔══════════════════════════════════╗");
  console.log("║   Seeding Popular Routes          ║");
  console.log("╚══════════════════════════════════╝\n");

  console.log(`Total routes to seed: ${ALL_ROUTES.length}\n`);

  let count = 0;
  for (let i = 0; i < ALL_ROUTES.length; i += BATCH_SIZE) {
    const batch = ALL_ROUTES.slice(i, i + BATCH_SIZE);
    for (const route of batch) {
      const geometryWKT = toLineStringWKT(route.coordinates);
      const trailheadWKT = toPointWKT(route.trailheadCoords);

      const rows = await sql`
        INSERT INTO popular_routes (
          slug, name, description,
          geometry,
          total_distance_m, elevation_gain_m, elevation_loss_m,
          max_elevation_m, min_elevation_m,
          activity, difficulty, region, state,
          best_months, season_notes,
          estimated_days, permit_required, permit_info,
          trailhead_name, trailhead_location,
          is_featured, published,
          meta_title, meta_description
        ) VALUES (
          ${route.slug}, ${route.name}, ${route.description},
          ${geometryWKT}::geometry,
          ${route.totalDistanceM}, ${route.elevationGainM}, ${route.elevationLossM},
          ${route.maxElevationM}, ${route.minElevationM},
          ${route.activity}, ${route.difficulty}, ${route.region}, ${route.state},
          ${`{${route.bestMonths.join(",")}}`}::integer[], ${route.seasonNotes},
          ${route.estimatedDays}, ${route.permitRequired}, ${route.permitInfo},
          ${route.trailheadName}, ${trailheadWKT}::geometry,
          ${route.isFeatured}, true,
          ${route.metaTitle}, ${route.metaDescription}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          geometry = EXCLUDED.geometry,
          total_distance_m = EXCLUDED.total_distance_m,
          elevation_gain_m = EXCLUDED.elevation_gain_m,
          elevation_loss_m = EXCLUDED.elevation_loss_m,
          max_elevation_m = EXCLUDED.max_elevation_m,
          min_elevation_m = EXCLUDED.min_elevation_m,
          activity = EXCLUDED.activity,
          difficulty = EXCLUDED.difficulty,
          region = EXCLUDED.region,
          state = EXCLUDED.state,
          best_months = EXCLUDED.best_months,
          season_notes = EXCLUDED.season_notes,
          estimated_days = EXCLUDED.estimated_days,
          permit_required = EXCLUDED.permit_required,
          permit_info = EXCLUDED.permit_info,
          trailhead_name = EXCLUDED.trailhead_name,
          trailhead_location = EXCLUDED.trailhead_location,
          is_featured = EXCLUDED.is_featured,
          meta_title = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          updated_at = now()
        RETURNING id
      `;

      const routeId = rows[0].id as string;

      await sql`DELETE FROM popular_route_waypoints WHERE route_id = ${routeId}`;

      for (const wp of route.waypoints) {
        const wpWKT = toPointWKT(wp.coords);
        await sql`
          INSERT INTO popular_route_waypoints (
            route_id, sort_order, name, location, elevation_m, waypoint_type, description
          ) VALUES (
            ${routeId}, ${wp.sortOrder}, ${wp.name},
            ${wpWKT}::geometry,
            ${wp.elevationM}, ${wp.waypointType}, ${wp.description}
          )
        `;
      }

      count++;
      process.stdout.write(
        `\r  Progress: ${count} / ${ALL_ROUTES.length} — ${route.name}`.padEnd(80),
      );
    }
  }

  console.log("\n");
}

async function printSummary(sql: postgres.Sql): Promise<void> {
  console.log("╔══════════════════════════════════╗");
  console.log("║           Summary                ║");
  console.log("╚══════════════════════════════════╝\n");

  const activityCounts = await sql`
    SELECT activity, COUNT(*)::int AS count
    FROM popular_routes
    GROUP BY activity
    ORDER BY activity
  `;

  for (const row of activityCounts) {
    console.log(`  ${(row.activity as string).padEnd(20)} ${row.count} routes`);
  }

  const featured = await sql`
    SELECT COUNT(*)::int AS count FROM popular_routes WHERE is_featured = true
  `;
  console.log(`\n  Featured routes: ${featured[0].count}`);

  const waypointCount = await sql`
    SELECT COUNT(*)::int AS count FROM popular_route_waypoints
  `;
  console.log(`  Total waypoints: ${waypointCount[0].count}`);

  const regionCounts = await sql`
    SELECT region, COUNT(*)::int AS count
    FROM popular_routes
    GROUP BY region
    ORDER BY count DESC
  `;
  console.log("\n  By region:");
  for (const row of regionCounts) {
    console.log(`    ${(row.region as string).padEnd(25)} ${row.count}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is required.");
    console.error(
      "Copy .env.local.example to .env.local and fill in your Supabase DATABASE_URL.",
    );
    process.exit(1);
  }

  const isLocal =
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  const sql = postgres(databaseUrl, {
    ssl: isLocal ? false : "require",
    max: 1,
    connect_timeout: 30,
  });

  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  Backcountry Conditions — Popular Route Seeder ║");
  console.log("╚═══════════════════════════════════════════════╝");

  try {
    await seedRoutes(sql);
    await printSummary(sql);
    console.log("\n✅ Seed complete!");
    console.log(`   ${ALL_ROUTES.length} popular routes seeded.\n`);
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
