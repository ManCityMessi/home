Travel map data sources
=======================

world-countries.geojson
  Country boundary geometry adapted from Natural Earth 1:50m Admin 0 data.
  Source project: https://github.com/nvkelso/natural-earth-vector
  Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/
  Natural Earth states that its raster and vector map data are public domain.

china-provinces.geojson
  China province-level boundary geometry sourced from DataV GeoAtlas:
  https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json
  The file was reduced to the province-level features used by this page and
  assigned stable page-specific IDs for matching visits to map shapes.

countries.json
  A 195-country catalogue derived from mledoze/countries, including Chinese
  and English names, continent/subregion fields, and representative coordinates:
  https://github.com/mledoze/countries
  This adapted database is provided under the Open Database License (ODbL) 1.0.
  License text: https://github.com/mledoze/countries/blob/master/LICENSE
  ODbL overview: https://opendatacommons.org/licenses/odbl/1-0/

The map catalogue groups sovereign states and the two UN observer states into
six continents. Territories that do not appear in this 195-country catalogue
may still appear as unvisited background shapes on the world map.
