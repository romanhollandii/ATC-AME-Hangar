const UFC_CRITERIA = {
    landingZone: {
  
      clearZone: {
        paved: {
          C130: {
            lengthFeet: 500,
            innerWidthFeet: 270,
            outerWidthFeet: 500
          },
  
          C17: {
            lengthFeet: 500,
            innerWidthFeet: 320,
            outerWidthFeet: 500
          }
        },
  
        semiPrepared: {
          C130: {
            lengthFeet: 500,
            innerWidthFeet: 270,
            outerWidthFeet: 500
          },
  
          C17: {
            lengthFeet: 500,
            innerWidthFeet: 320,
            outerWidthFeet: 500
          }
        }
      },
  
  
      primarySurface: {
        totalAdditionalLengthFeet: 1000,
        extensionBeyondEachEndFeet: 500,
  
        paved: {
          C130: {
            widthFeet: 150
          },
  
          C17: {
            widthFeet: 180
          }
        },
  
        semiPrepared: {
          C130: {
            widthFeet: 150
          },
  
          C17: {
            widthFeet: 180
          }
        }
      },
  
  
      adcs: {
        innerEdgeDistanceFromRunwayEndFeet: 500,
  
        innerWidthFeet: 500,
  
        minimumSlopeLengthFeet: 10500,
  
        desiredSlopeLengthFeet: 32000,
  
        outerWidthAtMinimumSlopeFeet: 2500,
  
        constantWidthStartDistanceFeet: 10500,
  
        constantWidthEndDistanceFeet: 32000,
  
        constantWidthFeet: 2500,

slope: {
  C130: {
    horizontal: 35,
    vertical: 1
  },

  C17: {
    horizontal: 20,
    vertical: 1
  }
}
    },

    apzLZ: {
      lengthFeet: 2500,
    
      widthFeet: {
        unoccupied: 500,
        occupiedBuiltUp: 1000
      }
    },
    
    exclusionArea: {
      includeClearZoneAtEachEnd: true,
    
      widthFeet: {
        unoccupied: 700,
        occupiedBuiltUp: 1000
      },
    
      navyMarinePermanentTrainingLZWidthFeet: 1000
    },

    operationalZones: {
    
      U28_PC12_MC12: {
        zoneA: {
          distanceFeet: 19.25,
          maxObstacleFeet: 4 / 12
        },
    
        zoneB: {
          distanceFeet: 5 + (4 / 12),
          maxObstacleFeet: 5
        },
    
        glideSlope: {
          horizontal: 12,
          vertical: 1,
          angleDegrees: 4.76
        }
      },
    
    
      C130: {
        zoneA: {
          distanceFeet: 35,
          maxObstacleFeet: 2 + (9 / 12)
        },
    
        zoneB: {
          distanceFeet: 25,
          maxObstacleFeet: 6 + (3 / 12)
        },
    
        glideSlope: {
          horizontal: 35,
          vertical: 1,
          angleDegrees: 1.64
        }
      },
    
    
      C17: {
        zoneA: {
          distanceFeet: 35,
          maxObstacleFeet: 3
        },
    
        zoneB: {
          distanceFeet: 33,
          maxObstacleFeet: 5
        },
    
        glideSlope: {
          horizontal: 20,
          vertical: 1,
          angleDegrees: 2.86
        }
      },
    
    
      C145A: {
        zoneA: {
          distanceFeet: 30 + (7 / 12),
          maxObstacleFeet: 3
        },
    
        zoneB: {
          distanceFeet: 7 + (3 / 12),
          maxObstacleFeet: 5
        },
    
        glideSlope: {
          horizontal: 8,
          vertical: 1,
          angleDegrees: 7.13
        }
      },
    
    
      C146A: {
        zoneA: {
          distanceFeet: 28 + (11 / 12),
          maxObstacleFeet: 3
        },
    
        zoneB: {
          distanceFeet: 6 + (11 / 12),
          maxObstacleFeet: 5
        },
    
        glideSlope: {
          horizontal: 20,
          vertical: 1,
          angleDegrees: 2.86
        }
      }
    
    }
  
    }
  };
  
  function getLZClearZoneCriteria(surfaceType, aircraftType) {
    const criteria =
      UFC_CRITERIA.landingZone.clearZone[surfaceType]?.[aircraftType];
  
    if (!criteria) {
      throw new Error("Invalid landing zone surface or aircraft type.");
    }
  
    return criteria;
  }