'use strict';
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');
const { ObjectID } = require('mongodb');

class StatsService {

    static async getStats(limit, next) {

        const spotsCount = await DbService.count(Utils.Collections.Spots, {});
        const usersCount = await DbService.count(Utils.Collections.Users, {});

        let result = {
            posts: spotsCount,
            users: usersCount
        }

        return result;
    }

    static mergeSubcategory(subCat1, subCat2) {
        let isCat = false;
        Object.keys(subCat2).forEach(function (key, index) {
            Object.keys(subCat1).forEach(function (key2, index2) {
                if (key2 == key) {
                    subCat1[key2].count += 1;
                    isCat = true;
                }
            });

            if (!isCat) {
                subCat1[key] = subCat2[key];
            }
            isCat = false;
        });
        return subCat1;
    }

    static async getStatList(to, from) {

        let filter = {};

        if (to && from) {
            filter = { "timestamp": { $gte: new Date(from).getTime(), $lte: (new Date(to).getTime() + 86400000) } };
        }
        else if (!to && from) {
            filter = { "timestamp": { $gte: new Date(from).getTime() } };
        }
        else if (to && !from) {
            filter = { "timestamp": { $lte: (new Date(to).getTime() + 86400000) } };
        }


        const sortBy = { timestamp: -1 };

        let spots = await DbService.find(Utils.Collections.Spots, filter, {}, sortBy);

        var statsList = [];
        var citiesList = {};

        _.map(spots, spot => {

            let date = StatsService.convertTimestampToDate(spot.timestamp)
            if (spot.category.subCategories)
                Object.keys(spot.category.subCategories).forEach(function (key, index) {
                    spot.category.subCategories[key].count = 1;
                    delete spot.category.subCategories[key].name;
                    delete spot.category.subCategories[key].index;
                    delete spot.category.subCategories[key].id;
                });

            if (spot.category.id)
                spot.category[spot.category.id] = { count: 1 };

            if (spot.category.subCategories)
                spot.category[spot.category.id].subCategories = spot.category.subCategories;


            let city = "";
            let country = "";

            if (spot.location.gmsAddress) {
                if (spot.location.gmsAddress.administrative_area_level_1){
                    city = spot.location.gmsAddress.administrative_area_level_1
                }
                else if(spot.location.gmsAddress.locality){
                    city = spot.location.gmsAddress.locality;
                }
                    
                if(spot.location.gmsAddress.country){    
                    country = StatsService.getCountryCode(spot.location.gmsAddress.country, 2);
                    if(typeof country == 'object'){
                        return;
                    }
                }
                else{
                    return;
                }
            }
            else{
                return;
            }
            let cities = {};


            if (country)
                cities[country] = {}

            if (cities[country] && city)
                cities[country][city] = 1;



            delete spot.category.subCategories
            delete spot.category.id;
            delete spot.category.index;
            delete spot.category.name;

            let stat = {
                categories: spot.category,
                day: date,
                geoStats: StatsService.getCountryCode(spot.location.gmsAddress.country, 1),
                cities: cities
            };


            let countrykey = Object.keys(stat.cities)[0];
            let isFindCountryFlag = false;
            Object.keys(citiesList).forEach(function (keyM, i) {
                if (countrykey == keyM) {
                    isFindCountryFlag = true;
                    let citykey = Object.keys(stat.cities[countrykey])[0];
                    let isFindCityFlag = false;
                    Object.keys(citiesList[keyM]).forEach(function (key2, index2) {
                        if (key2 == citykey) {
                            citiesList[keyM][key2] += 1;
                            isFindCityFlag = true;
                        }
                    });
                    if (!isFindCityFlag) {
                        citiesList[keyM] = Object.assign({}, citiesList[keyM], stat.cities[keyM]);

                    }
                }
            });
            if (!isFindCountryFlag) {
                citiesList = Object.assign({}, citiesList, stat.cities);
            }

            var statIndex = statsList.map(function (e) { return e.day; }).indexOf(date);
            if (statIndex == -1) {
                statsList.push(stat);
            }
            else {
                let categoryflag = false;
                Object.keys(statsList[statIndex].categories).forEach(function (key, index) {
                    if (key == Object.keys(stat.categories)[0]) {
                        statsList[statIndex].categories[key].count += 1;
                        statsList[statIndex].categories[key].subCategories = StatsService.mergeSubcategory(statsList[statIndex].categories[key].subCategories, stat.categories[key].subCategories);
                        categoryflag = true;
                    }

                });

                if (!categoryflag) {
                    statsList[statIndex].categories = Object.assign({}, statsList[statIndex].categories, stat.categories);
                }

                let geoflag = false;
                Object.keys(statsList[statIndex].geoStats).forEach(function (key, index) {
                    if (key == Object.keys(stat.geoStats)[0]) {
                        statsList[statIndex].geoStats[key] += 1;
                        geoflag = true;
                    }
                });

                if (!geoflag) {
                    statsList[statIndex].geoStats = Object.assign({}, statsList[statIndex].geoStats, stat.geoStats);
                }


                let countryflag = false;
                Object.keys(statsList[statIndex].cities).forEach(function (key, index) {
                    if (key == Object.keys(stat.cities)[0]) {
                        let cityflag = false;
                        let findCityObj = {};
                        Object.keys(statsList[statIndex].cities[key]).forEach(function (key2, index2) {
                            let findCity = Object.keys(stat.cities)[0];
                            findCityObj = stat.cities[findCity];
                            findCity = Object.keys(findCityObj)[0]

                            if (key2 == findCity) {
                                statsList[statIndex].cities[key][key2] += 1;
                                cityflag = true;
                            }
                        })
                        if (!cityflag) {
                            statsList[statIndex].cities[key] = Object.assign({}, statsList[statIndex].cities[key], findCityObj);
                        }

                        //  statsList[statIndex].cities[key] += 1;
                        countryflag = true;
                    }
                });

                if (!countryflag) {
                    statsList[statIndex].cities = Object.assign({}, statsList[statIndex].cities, stat.cities);
                }




                //  statsList[statIndex].categories.count = parseInt(statsList[statIndex].categories.count) + 1;
                // statsList[statIndex].categories = Object.assign({}, statsList[statIndex].categories, stat.categories);
                // statsList[statIndex].geoStats = Object.assign({}, statsList[statIndex].geoStats, stat.geoStats);
            }


        });

        return { stats: statsList, cities: citiesList };

    }

    static convertTimestampToDate(timestamp) {
        var date = new Date(timestamp).toISOString();
        date = date.split("T");
        return date[0];
    }

    static getCountryCode(country, type) {
        let isoCountries = {
            'AF': 'Afghanistan',
            'AX': 'Aland Islands',
            'AL': 'Albania',
            'DZ': 'Algeria',
            'AS': 'American Samoa',
            'AD': 'Andorra',
            'AO': 'Angola',
            'AI': 'Anguilla',
            'AQ': 'Antarctica',
            'AG': 'Antigua And Barbuda',
            'AR': 'Argentina',
            'AM': 'Armenia',
            'AW': 'Aruba',
            'AU': 'Australia',
            'AT': 'Austria',
            'AZ': 'Azerbaijan',
            'BS': 'Bahamas',
            'BH': 'Bahrain',
            'BD': 'Bangladesh',
            'BB': 'Barbados',
            'BY': 'Belarus',
            'BE': 'Belgium',
            'BZ': 'Belize',
            'BJ': 'Benin',
            'BM': 'Bermuda',
            'BT': 'Bhutan',
            'BO': 'Bolivia',
            'BA': 'Bosnia And Herzegovina',
            'BW': 'Botswana',
            'BV': 'Bouvet Island',
            'BR': 'Brazil',
            'IO': 'British Indian Ocean Territory',
            'BN': 'Brunei Darussalam',
            'BG': 'Bulgaria',
            'BF': 'Burkina Faso',
            'BI': 'Burundi',
            'BVI' : 'British Virgin Islands',
            'KH': 'Cambodia',
            'CM': 'Cameroon',
            'CA': 'Canada',
            'CV': 'Cape Verde',
            'KY': 'Cayman Islands',
            'CF': 'Central African Republic',
            'TD': 'Chad',
            'CL': 'Chile',
            'CN': 'China',
            'CX': 'Christmas Island',
            'CC': 'Cocos (Keeling) Islands',
            'CO': 'Colombia',
            'KM': 'Comoros',
            'CG': 'Congo',
            'CD': 'Congo, Democratic Republic',
            'CK': 'Cook Islands',
            'CR': 'Costa Rica',
            'CI': 'Cote D\'Ivoire',
            'HR': 'Croatia',
            'CU': 'Cuba',
            'CY': 'Cyprus',
            'CZ': 'Czech Republic',
            'CZ': 'Czechia',
            'DK': 'Denmark',
            'DJ': 'Djibouti',
            'DM': 'Dominica',
            'DO': 'Dominican Republic',
            'EC': 'Ecuador',
            'EG': 'Egypt',
            'SV': 'El Salvador',
            'GQ': 'Equatorial Guinea',
            'ER': 'Eritrea',
            'EE': 'Estonia',
            'ET': 'Ethiopia',
            'FK': 'Falkland Islands (Malvinas)',
            'FO': 'Faroe Islands',
            'FJ': 'Fiji',
            'FI': 'Finland',
            'FR': 'France',
            'GF': 'French Guiana',
            'PF': 'French Polynesia',
            'TF': 'French Southern Territories',
            'GA': 'Gabon',
            'GM': 'Gambia',
            'GE': 'Georgia',
            'DE': 'Germany',
            'GH': 'Ghana',
            'GI': 'Gibraltar',
            'GR': 'Greece',
            'GL': 'Greenland',
            'GD': 'Grenada',
            'GP': 'Guadeloupe',
            'GU': 'Guam',
            'GT': 'Guatemala',
            'GG': 'Guernsey',
            'GN': 'Guinea',
            'GW': 'Guinea-Bissau',
            'GY': 'Guyana',
            'HT': 'Haiti',
            'HM': 'Heard Island & Mcdonald Islands',
            'VA': 'Holy See (Vatican City State)',
            'HN': 'Honduras',
            'HK': 'Hong Kong',
            'HU': 'Hungary',
            'IS': 'Iceland',
            'IN': 'India',
            'ID': 'Indonesia',
            'IR': 'Iran, Islamic Republic Of',
            'IQ': 'Iraq',
            'IE': 'Ireland',
            'IM': 'Isle Of Man',
            'IL': 'Israel',
            'IT': 'Italy',
            'JM': 'Jamaica',
            'JP': 'Japan',
            'JE': 'Jersey',
            'JO': 'Jordan',
            'KZ': 'Kazakhstan',
            'KE': 'Kenya',
            'KI': 'Kiribati',
            'KR': 'Korea',
            'KW': 'Kuwait',
            'KG': 'Kyrgyzstan',
            'LA': 'Lao People\'s Democratic Republic',
            'LV': 'Latvia',
            'LB': 'Lebanon',
            'LS': 'Lesotho',
            'LR': 'Liberia',
            'LY': 'Libyan Arab Jamahiriya',
            'LI': 'Liechtenstein',
            'LT': 'Lithuania',
            'LU': 'Luxembourg',
            'MO': 'Macao',
            'MK': 'Macedonia',
            'MG': 'Madagascar',
            'MW': 'Malawi',
            'MY': 'Malaysia',
            'MV': 'Maldives',
            'ML': 'Mali',
            'MT': 'Malta',
            'MH': 'Marshall Islands',
            'MQ': 'Martinique',
            'MR': 'Mauritania',
            'MU': 'Mauritius',
            'YT': 'Mayotte',
            'MX': 'Mexico',
            'FM': 'Micronesia, Federated States Of',
            'MD': 'Moldova',
            'MC': 'Monaco',
            'MN': 'Mongolia',
            'ME': 'Montenegro',
            'MS': 'Montserrat',
            'MA': 'Morocco',
            'MZ': 'Mozambique',
            'MM': 'Myanmar',
            'NA': 'Namibia',
            'NR': 'Nauru',
            'NP': 'Nepal',
            'NL': 'Netherlands',
            'AN': 'Netherlands Antilles',
            'NC': 'New Caledonia',
            'NZ': 'New Zealand',
            'NI': 'Nicaragua',
            'NE': 'Niger',
            'NG': 'Nigeria',
            'NU': 'Niue',
            'NF': 'Norfolk Island',
            'MP': 'Northern Mariana Islands',
            'NO': 'Norway',
            'OM': 'Oman',
            'PK': 'Pakistan',
            'PW': 'Palau',
            'PS': 'Palestinian Territory, Occupied',
            'PA': 'Panama',
            'PG': 'Papua New Guinea',
            'PY': 'Paraguay',
            'PE': 'Peru',
            'PH': 'Philippines',
            'PN': 'Pitcairn',
            'PL': 'Poland',
            'PT': 'Portugal',
            'PR': 'Puerto Rico',
            'QA': 'Qatar',
            'RE': 'Reunion',
            'RO': 'Romania',
            'RU': 'Russian Federation',
            'RW': 'Rwanda',
            'BL': 'Saint Barthelemy',
            'SH': 'Saint Helena',
            'KN': 'Saint Kitts And Nevis',
            'LC': 'Saint Lucia',
            'MF': 'Saint Martin',
            'PM': 'Saint Pierre And Miquelon',
            'VC': 'Saint Vincent And Grenadines',
            'WS': 'Samoa',
            'SM': 'San Marino',
            'ST': 'Sao Tome And Principe',
            'SA': 'Saudi Arabia',
            'SN': 'Senegal',
            'RS': 'Serbia',
            'SC': 'Seychelles',
            'SL': 'Sierra Leone',
            'SG': 'Singapore',
            'SK': 'Slovakia',
            'SI': 'Slovenia',
            'SB': 'Solomon Islands',
            'SO': 'Somalia',
            'ZA': 'South Africa',
            'GS': 'South Georgia And Sandwich Isl.',
            'ES': 'Spain',
            'LK': 'Sri Lanka',
            'SD': 'Sudan',
            'SR': 'Suriname',
            'SJ': 'Svalbard And Jan Mayen',
            'SZ': 'Swaziland',
            'SE': 'Sweden',
            'CH': 'Switzerland',
            'SY': 'Syrian Arab Republic',
            'TW': 'Taiwan',
            'TJ': 'Tajikistan',
            'TZ': 'Tanzania',
            'TH': 'Thailand',
            'TL': 'Timor-Leste',
            'TG': 'Togo',
            'TK': 'Tokelau',
            'TO': 'Tonga',
            'TT': 'Trinidad And Tobago',
            'TN': 'Tunisia',
            'TR': 'Turkey',
            'TM': 'Turkmenistan',
            'TC': 'Turks And Caicos Islands',
            'TV': 'Tuvalu',
            'UG': 'Uganda',
            'UA': 'Ukraine',
            'AE': 'United Arab Emirates',
            'GB': 'United Kingdom',
            'US': 'United States',
            'UM': 'United States Outlying Islands',
            'UY': 'Uruguay',
            'UZ': 'Uzbekistan',
            'UK': 'Regno Unito', 
            'VU': 'Vanuatu',
            'VE': 'Venezuela',
            'VN': 'Vietnam',
            'VG': 'Virgin Islands, British',
            'VI': 'Virgin Islands, U.S.',
            'WF': 'Wallis And Futuna',
            'EH': 'Western Sahara',
            'YE': 'Yemen',
            'ZM': 'Zambia',
            'ZW': 'Zimbabwe'
        }

        let retObj = {};
        let result = Object.entries(isoCountries).find(function ([countryCode, countryName]) {
            if (countryName && country) {
                return countryName.toLowerCase() == country.toLowerCase()
            }
            else {
                return false;
            }
        });
        if (result) {
            retObj[result[0]] = 1
            if (type == 1)
                return retObj;
            else if (type == 2)
                return result[0];
        }

        return retObj;
    }

}

module.exports = StatsService;


