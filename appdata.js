const atisFrequenciesDict = {"UUEE":{"departure":["125.125","126.375"],"arrival":["122.075","120.375"]},"UNKL":{"departure":["126.8",""],"arrival":["",""]},"USNN":{"departure":["126.6",""],"arrival":["",""]},"USRR":{"departure":["124.8",""],"arrival":["",""]},"UUYY":{"departure":["126.6",""],"arrival":["",""]},"USPP":{"departure":["126.4",""],"arrival":["",""]},"UNAA":{"departure":["126.2",""],"arrival":["",""]},"UNEE":{"departure":["128.7",""],"arrival":["",""]},"UNTT":{"departure":["127.8",""],"arrival":["",""]},"UNNT":{"departure":["131.3","127.4"],"arrival":["",""]},"UNBB":{"departure":["129.7",""],"arrival":["",""]},"USHH":{"departure":["126.4",""],"arrival":["",""]},"USTR":{"departure":["121.7",""],"arrival":["",""]},"USSS":{"departure":["127.8",""],"arrival":["",""]},"UUYH":{"departure":["127.4",""],"arrival":["",""]},"USKK":{"departure":["134.9",""],"arrival":["",""]},"UWKD":{"departure":["136.825","126.8"],"arrival":["",""]},"UWGG":{"departure":["132.7",""],"arrival":["",""]},"UWPS":{"departure":["123.35",""],"arrival":["",""]},"UUDL":{"departure":["127.35",""],"arrival":["",""]},"UUDD":{"departure":["128.3","122.95"],"arrival":["",""]},"UUWW":{"departure":["124.45","125.875"],"arrival":["131.85","127.8"]},"ULLI":{"departure":["127.3","127.4"],"arrival":["",""]},"UIBB":{"departure":["127.2",""],"arrival":["",""]},"UIUU":{"departure":["126.6",""],"arrival":["",""]},"UIAA":{"departure":["134.8","126.4"],"arrival":["",""]},"UIII":{"departure":["126.9","124.850"],"arrival":["",""]},"UWSG":{"departure":["123.375","121.775"],"arrival":["",""]},"UWKS":{"departure":["123.6","120.9"],"arrival":["",""]},"UWLL":{"departure":["128.850","126.6"],"arrival":["",""]},"UWWW":{"departure":["134.1","134.9"],"arrival":["",""]},"UWUU":{"departure":["119.4","124.8"],"arrival":["",""]},"USCC":{"departure":["128.3",""],"arrival":["",""]},"UNOO":{"departure":["126.4",""],"arrival":["",""]},"UAOO":{"departure":["134.9","122.9"],"arrival":["",""]},"UATT":{"departure":["126.0","127.8"],"arrival":["",""]},"UWOO":{"departure":["126.4",""],"arrival":["",""]},"UARR":{"departure":["124.8","134.9"],"arrival":["",""]},"URWW":{"departure":["127.0","129.9"],"arrival":["",""]},"URWA":{"departure":["125.625","131.5"],"arrival":["",""]},"UELL":{"departure":["126.8",""],"arrival":["",""]},"UERR":{"departure":["126.6",""],"arrival":["",""]},"UHMM":{"departure":["127.4",""],"arrival":["",""]},"UHPP":{"departure":["126.8",""],"arrival":["",""]},"UHMA":{"departure":["125.4","126.2"],"arrival":["",""]},"URMM":{"departure":["125.250","127.4"],"arrival":["",""]},"UATE":{"departure":["130.1","126.2"],"arrival":["",""]},"UBBB":{"departure":["126.8",""],"arrival":["",""]},"UNBG":{"departure":["128.1",""],"arrival":["",""]},"URMT":{"departure":["134.2","128.825"],"arrival":["",""]},"URSS":{"departure":["129.375","126.2"],"arrival":["",""]},"URMG":{"departure":["127.2",""],"arrival":["",""]},"HEGN":{"departure":["120.450",""],"arrival":["",""]},"HECA":{"departure":["122.6",""],"arrival":["",""]},"HESH":{"departure":["126.225",""],"arrival":["",""]},"UOOO":{"departure":["126.8",""],"arrival":["",""]},"USMU":{"departure":["127.2",""],"arrival":["",""]},"USMM":{"departure":["125.9",""],"arrival":["",""]},"UUYS":{"departure":["127.9",""],"arrival":["",""]},"UMMS":{"departure":["128.850","135.850"],"arrival":["",""]},"URML":{"departure":["125.475","124.8"],"arrival":["",""]},"OIIE":{"departure":["127.2",""],"arrival":["",""]},"OIFM":{"departure":["128.250",""],"arrival":["",""]},"OISS":{"departure":["127.0",""],"arrival":["",""]},"OMDW":{"departure":["126.475",""],"arrival":["123.175",""]},"OMSJ":{"departure":["122.4",""],"arrival":["",""]},"OMDB":{"departure":["131.7",""],"arrival":["126.275",""]},"URMO":{"departure":["118.5",""],"arrival":["",""]},"UWKE":{"departure":["134.2",""],"arrival":["",""]},"LTAI":{"departure":["136.125",""],"arrival":["118.275",""]},"LTAC":{"departure":["123.6",""],"arrival":["",""]},"UHBB":{"departure":["126.4",""],"arrival":["",""]},"UEEE":{"departure":["129.950","126.2"],"arrival":["",""]},"UHSS":{"departure":["126.2",""],"arrival":["",""]},"ULMM":{"departure":["126.8","127.4"],"arrival":["",""]},"LTFE":{"departure":["128.5",""],"arrival":["",""]},"LTBS":{"departure":["127.350",""],"arrival":["",""]},"LTFM":{"departure":["128.850",""],"arrival":["126.350",""]},"UDYZ":{"departure":["119.5",""],"arrival":["",""]},"UHHH":{"departure":["129.3","124.875"],"arrival":["",""]},"UHWW":{"departure":["127.8","125.1"],"arrival":["",""]}}

const maintenance = {
    "B737": {
        "icao": [
            'URSS', 'UNKL', 'UWOO', 'USPP', 'UWUU', 'UWKD', 'UMKK', 'UWGG', 'URMM', 'USSS', 'URML', 'URWW', 'UNBG',
            'UNNT', 'UIII', 'ULAA', 'LTAI', 'UDYZ', 'LTFM', 'ULMM', 'UNOO', 'UUYY', 'URMG', 'OMDW', 'UAAA', 'OMDB',
            'OMAA', 'ULLI', 'USTR', 'UWWW', 'USRR', 'UEEE', 'VTBS', 'HECA', 'HESH', 'HEGN', 'UMMS', 'LTBS', 'UTTT',
            'UTSS', 'UAFO', 'URWA', 'UHHH', 'URMT', 'UHWW', 'UCFM', 'UBBB', 'VTSP', 'ZJSY'
        ],
        "notam": "AFL 9EMIH/24 (11 JUN 25)"
    },
    "A320N,A321N": {
        "icao": [
            'URSS', 'UNKL', 'UMKK', 'URMM', 'USSS', 'URML', 'ULAA', 'UDYZ', 'LTFM', 'UNOO', 'UUYY', 'URMG',
            'OMDW', 'UAAA', 'OMDB', 'OMAA', 'HESH', 'HEGN', 'UTTT', 'ZJSY', 'UNNT', 'UWOO', 'USRR', 'LTAI', 'VTBS',
            'VIDP', 'LTBS', 'VTSP', 'UTSS'
        ],
        "notam": "AFL 9EMII/24 (11 JUN 25)"
    },
    "A320,A320S,A321,A321S": {
        "icao": [
            'URSS', 'UNKL', 'USPP', 'UWUU', 'UWKD', 'UMKK', 'UWGG', 'URMM', 'USSS', 'URML', 'URWW', 'UNBG',
            'UNNT', 'UIII', 'ULAA', 'LTAI', 'UDYZ', 'LTFM', 'ULMM', 'UNOO', 'UUYY', 'URMG', 'OMDW', 'UAAA', 'OMDB',
            'OMAA', 'ULLI', 'USTR', 'UWWW', 'USCC', 'HECA', 'HESH', 'HEGN', 'UMMS', 'UCFM', 'LTBS', 'UTTT', 'URWA',
            'VIDP', 'UBBB', 'UWSG', 'UWOO', 'USRR', 'URMT', 'UHSS', 'UHWW', 'VTBS', 'VTSP', 'UAFO', 'UTSS'
        ],
        "notam": "AFL 9EMJ1/24 (11 JUN 25)"
    },
    "B777": {
        "icao": [
            'URSS', 'UHHH', 'UHWW', 'UHPP', 'LTAI', 'LTFM', 'ULLI', 'VIDP', 'VTSP', 'VTBS', 'HECA', 'HESH', 'HEGN',
            'VCBI', 'UNNT', 'UHSS', 'OMAA', 'ZGGG', 'OMDW', 'OMDB', 'ZSPD', 'ZJSY'
        ],
        "notam": "AFL 9EMIC/24 (11 JUN 25)"
    },
    "A330": {
        "icao": [
            'URSS', 'UNKL', 'UHHH', 'UHWW', 'UMKK', 'USSS', 'LTAI', 'LTFM', 'UAAA', 'ULLI', 'VTSP', 'VTBS', 'HECA',
            'HESH', 'HEGN', 'VCBI', 'UWKD', 'UNNT', 'UWUU', 'OMAA', 'OMDW', 'OMDB', 'ZJSY'
        ],
        "notam": "AFL 9EMIE/24 (11 JUN 25)"
    },
    "A350": {
        "icao": ['URSS', 'UHHH', 'UHWW', 'UHSS', 'VTBS', 'VCBI', 'HEGN', 'HESH', 'ZJSY'],
        "notam": "AFL 9JDJ5/24 (11 JUN 25)"
    }
}

let nowIcao = null;
let showSecondMenu = JSON.parse(localStorage.getItem('showSecondMenu')) || false;
let icaoKeys = null;

// 35
const airportsB = ['VVCR', 'EPKK', 'LTAF', 'ZPPP', 'LTDB', 'ZLLL', 'LCLK', 'UAAA', 'KLAS', 'LFLL', 'KLAX', 'FMMI', 'UHMM', 'USCM', 'VAAH', 'LEBL', 'KMIA', 'VMMC', 'LEMG', 'RPLL', 'SBBR', 'OOMS', 'LEVC', 'URML', 'MUVR', 'URMM', 'LIPX', 'HKMO', 'UHWW', 'DTMB', 'URMO', 'CYUL', 'EGKK', 'VABB', 'VHHH', 'GCLP', 'URMN', 'URMG', 'UTFN', 'ZGGG', 'UOOO', 'UACC', 'VVDN', 'HTDA', 'KONT', 'WADD', 'KMCO', 'KDTW', 'RJBB', 'CYOW', 'HTZA', 'LTBJ', 'LFPG', 'LFPO', 'UCFL', 'ULMK', 'ZBAA', 'OPPS', 'RJTT', 'UNTT', 'VTSP', 'CYYZ', 'LTCG', 'SBRF', 'DTTA', 'LIRF', 'ZMCK', 'LIPR', 'UIUU', 'SBGL', 'VTBU', 'URRP', 'UTFF', 'GVAC', 'KPHL', 'SBSV', 'EDDF', 'UTSS', 'VVNB', 'KSAN', 'ZSHC', 'ZJSY', 'UTDL', 'SBGR', 'KSFO', 'RKSI', 'RKPC', 'ZLXY', 'VOMM', 'URMS', 'UIAA', 'LBSF', 'ZUUU', 'KTPA', 'ZYTX', 'UUEE', 'DTNH', 'GCTS', 'UTST']
// 98
const airportsBz = ['GMAD', 'LEAL', 'OJAI', 'LTAC', 'EGLL', 'LTAI', 'LGAV', 'LEMD', 'OLBA', 'UCFM', 'UHBB', 'LIMC', 'LOWW', 'ULMM', 'UNBG', 'UTSA', 'UBBG', 'LLOV', 'UDYZ', 'LSGG', 'UCFO', 'LEPA', 'UIII', 'LCPH', 'BIKF', 'LBPD', 'BIRK', 'HEGN', 'LSZH', 'LTBA', 'HESH', 'UGTB', 'OIIE', 'LLBG', 'UHSS']
// 37
const airportsC = ['OJAQ', 'FIMP', 'UHMA', 'LFML', 'LFKJ', 'LTFE', 'LIME', 'MMMX', 'RKPK', 'LIRN', 'URKG', 'LFMN', 'LFLS', 'KJFK', 'LTBS', 'UHPP', 'LDDU', 'LYPG', 'UTDD', 'LGTS', 'LOWS', 'FSIA', 'LOWI', 'URSS', 'LGIR', 'LDSP', 'LKKV', 'ZBYN', 'VNKT', 'OIII', 'LGKR', 'LYTV', 'UTDK', 'LIMF', 'LJLJ', 'LFLB', 'LTCE']

const runwayConditionCaptions = {
    6: 'DRY',
    5: 'GOOD',
    4: 'GOOD/MEDIUM',
    3: 'MEDIUM',
    2: 'MEDIUM/POOR',
    1: 'POOR'
}
const reportedBrakingActions = {
    takeoff: {
        dry: {
            kts: 34,
            mps: 17.5
        },
        good: {
            kts: 25,
            mps: 12.9
        },
        good_to_medium: {
            kts: 22,
            mps: 11.3
        },
        medium: {
            kts: 20,
            mps: 10.3
        },
        medium_to_poor: {
            kts: 15,
            mps: 7.7
        },
        poor: {
            kts: 13,
            mps: 6.7
        }
    },
    landing: {
        dry: {
            kts: 40,
            mps: 20.6
        },
        good: {
            kts: 40,
            mps: 20.6
        },
        good_to_medium: {
            kts: 35,
            mps: 18.0
        },
        medium: {
            kts: 25,
            mps: 12.9
        },
        medium_to_poor: {
            kts: 17,
            mps: 8.7
        },
        poor: {
            kts: 15,
            mps: 7.7
        }
    }
};
const coefficientBrakingActions = {
    normative: {
        takeoff: {
            0.5: {
                kts: 34,
                mps: 17.5,
                code: 6
            },
            0.42: {
                kts: 25,
                mps: 12.9,
                code: 5
            },
            0.4: {
                kts: 22,
                mps: 11.3,
                code: 4
            },
            0.37: {
                kts: 20,
                mps: 10.3,
                code: 3
            },
            0.35: {
                kts: 15,
                mps: 7.7,
                code: 2
            },
            0.3: {
                kts: 13,
                mps: 6.7,
                code: 1
            }
        },
        landing: {
            0.5: {
                kts: 40,
                mps: 20.6,
                code: 6
            },
            0.42: {
                kts: 40,
                mps: 20.6,
                code: 5
            },
            0.4: {
                kts: 35,
                mps: 18.0,
                code: 4
            },
            0.37: {
                kts: 25,
                mps: 12.9,
                code: 3
            },
            0.35: {
                kts: 17,
                mps: 8.7,
                code: 2
            },
            0.3: {
                kts: 15,
                mps: 7.7,
                code: 1
            }
        }
    },
    by_sft: {
        takeoff: {
            0.51: {
                kts: 34,
                mps: 17.5,
                code: 6
            },
            0.4: {
                kts: 25,
                mps: 12.9,
                code: 5
            },
            0.36: {
                kts: 22,
                mps: 11.3,
                code: 4
            },
            0.3: {
                kts: 20,
                mps: 10.3,
                code: 3
            },
            0.26: {
                kts: 15,
                mps: 7.7,
                code: 2
            },
            0.17: {
                kts: 13,
                mps: 6.7,
                code: 1
            }
        },
        landing: {
            0.51: {
                kts: 40,
                mps: 20.6,
                code: 6
            },
            0.4: {
                kts: 40,
                mps: 20.6,
                code: 5
            },
            0.36: {
                kts: 35,
                mps: 18.0,
                code: 4
            },
            0.3: {
                kts: 25,
                mps: 12.9,
                code: 3
            },
            0.26: {
                kts: 17,
                mps: 8.7,
                code: 2
            },
            0.17: {
                kts: 15,
                mps: 7.7,
                code: 1
            }
        }
    }
};
