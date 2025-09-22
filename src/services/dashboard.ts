import { getCollection } from "../modules/db/database.ts";

// Response Types for Dashboard
export interface RecentBookingVehicle {
  bikeId: string;
  vehicleNumber: string;
  modelName: string;
  brand: string;
  category: string;
  basePrice: number;
  weekendMultiplier: number;
  currency: string;
}

export interface RecentBooking {
  bookingId: string;
  vehicles: RecentBookingVehicle[];
  fromDate: Date;
  toDate: Date;
  totalDays: number;
  status: string;
  completedDaysAgo: number;
  totalAmount: number;
}

export interface RecommendedBike {
  bikeId: string;
  modelInfo: {
    brand: string;
    model: string;
    category: string;
    type: string;
    transmission: string;
    imageUrl?: string;
  };
  pricing: {
    basePrice: number;
    weekendMultiplier: number;
    currency: string;
  };
}

export interface DashboardBookingsData {
  recentBookings: RecentBooking[];
  recommendedBikes: RecommendedBike[];
}

/**
 * Get recent bookings and recommended bikes in a single aggregation pipeline
 */
export async function getBookingsAndRecommendations(
  userId: string,
  limit: number = 3
): Promise<DashboardBookingsData> {
  try {
    const bookings = await getCollection("bookings");
    const pipline = [
      {
        $match: {
          userId: userId,
          $or: [{ bookingStatus: "CONFIRMED" }, { bookingStatus: "COMPLETED" }],
        },
      },

      // Stage 2: Sort by most recent and limit
      {
        $sort: { updatedAt: -1 },
      },
      {
        $limit: limit,
      },

      // Stage 3: Add calculated fields for recent bookings
      {
        $addFields: {
          totalDays: {
            $ceil: {
              $divide: [
                { $subtract: ["$toDate", "$fromDate"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },

      // Stage 4: Group to collect recent bookings and extract bike info for recommendations
      {
        $group: {
          _id: null,
          recentBookings: {
            $push: {
              bookingId: "$bookingId",
              vehicles: "$vehicles",
              fromDate: "$fromDate",
              toDate: "$toDate",
              totalDays: "$totalDays",
              status: "$bookingStatus",
              totalAmount: { $ifNull: ["$pricing.totalAmount", 0] },
            },
          },
          // Collect unique bike IDs, categories, and brands for recommendations
          allBikeIds: {
            $addToSet: {
              $map: {
                input: "$vehicles",
                as: "vehicle",
                in: "$$vehicle.bikeId",
              },
            },
          },
          allCategories: {
            $addToSet: {
              $map: {
                input: "$vehicles",
                as: "vehicle",
                in: "$$vehicle.category",
              },
            },
          },
          allBrands: {
            $addToSet: {
              $map: {
                input: "$vehicles",
                as: "vehicle",
                in: "$$vehicle.brand",
              },
            },
          },
          firstBookingId: { $first: "$bookingId" },
        },
      },

      // Stage 5: Flatten arrays
      {
        $addFields: {
          flatBikeIds: {
            $reduce: {
              input: "$allBikeIds",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
          flatCategories: {
            $reduce: {
              input: "$allCategories",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
          flatBrands: {
            $reduce: {
              input: "$allBrands",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
        },
      },

      // Stage 6: Get unique values
      {
        $addFields: {
          uniqueBikeIds: { $setUnion: ["$flatBikeIds", []] },
          uniqueCategories: { $setUnion: ["$flatCategories", []] },
          uniqueBrands: { $setUnion: ["$flatBrands", []] },
        },
      },

      // Stage 7: Lookup recommended bikes from bikes collection
      {
        $lookup: {
          from: "bikes",
          let: {
            bikeIds: "$uniqueBikeIds",
            categories: "$uniqueCategories",
            brands: "$uniqueBrands",
            firstBookingId: "$firstBookingId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isActive", true] },
                    {
                      $or: [
                        // Previous bikes (same bikeId)
                        { $in: ["$bikeId", "$$bikeIds"] },
                        // Same category bikes
                        { $in: ["$modelInfo.category", "$$categories"] },
                        // Same brand bikes
                        { $in: ["$modelInfo.brand", "$$brands"] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $sort: {
                reason: 1, // previous_booking first, then same_category, then same_brand
                createdAt: -1,
              },
            },
            {
              $limit: limit,
            },
          ],
          as: "recommendedBikes",
        },
      },

      // Stage 8: Handle case when no recommendations found (get random bikes)
      {
        $lookup: {
          from: "bikes",
          let: {
            hasRecommendations: {
              $gt: [{ $size: "$recommendedBikes" }, 0],
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $not: "$$hasRecommendations" }, // Only run if no recommendations
                  ],
                },
              },
            },
            {
              $limit: limit,
            },
          ],
          as: "randomBikes",
        },
      },

      // Stage 9: Combine recommendations or use random bikes
      {
        $addFields: {
          finalRecommendations: {
            $cond: {
              if: { $gt: [{ $size: "$recommendedBikes" }, 0] },
              then: "$recommendedBikes",
              else: "$randomBikes",
            },
          },
        },
      },

      // Stage 10: Project final result
      {
        $project: {
          _id: 0,
          recentBookings: 1,
          recommendedBikes: {
            $map: {
              input: "$finalRecommendations",
              as: "bike",
              in: {
                bikeId: "$$bike.bikeId",
                modelInfo: {
                  brand: "$$bike.modelInfo.brand",
                  model: "$$bike.modelInfo.model",
                  category: "$$bike.modelInfo.category",
                  type: "$$bike.modelInfo.type",
                  transmission: "$$bike.modelInfo.transmission",
                  imageUrl: "$$bike.modelInfo.imageUrl",
                },
                pricing: {
                  basePrice: "$$bike.pricing.basePrice",
                },
              },
            },
          },
        },
      },
    ];
    const result = await bookings.aggregate(pipline).toArray();

    // Handle empty result (no bookings found)
    if (result.length === 0) {
      const bikeCol = await getCollection("bikes");
      const randomBikes = await bikeCol
        .aggregate([
          {
            $match: { isActive: true },
          },
          {
            $sample: { size: limit },
          },
          {
            $project: {
              _id: 0,
              bikeId: 1,
              modelInfo: {
                brand: "$modelInfo.brand",
                model: "$modelInfo.model",
                category: "$modelInfo.category",
                type: "$modelInfo.type",
                transmission: "$modelInfo.transmission",
                imageUrl: "$modelInfo.imageUrl",
              },
              pricing: {
                basePrice: "$pricing.basePrice",
                weekendMultiplier: "$pricing.weekendMultiplier",
                currency: "$pricing.currency",
              },
              reason: { $literal: "random_suggestion" },
            },
          },
        ])
        .toArray();

      return {
        recentBookings: [],
        recommendedBikes: randomBikes.map((bike: any) => ({
          bikeId: bike.bikeId,
          modelInfo: {
            brand: bike.modelInfo.brand,
            model: bike.modelInfo.model,
            category: bike.modelInfo.category,
            type: bike.modelInfo.type,
            transmission: bike.modelInfo.transmission,
            imageUrl: bike.modelInfo.imageUrl,
          },
          pricing: {
            basePrice: bike.pricing.basePrice,
            weekendMultiplier: bike.pricing.weekendMultiplier,
            currency: bike.pricing.currency,
          },
        })),
      };
    }

    return {
      recentBookings: result[0].recentBookings || [],
      recommendedBikes: result[0].recommendedBikes || [],
    };
  } catch (error) {
    console.error("Error fetching bookings and recommendations:", error);
    throw new Error("Failed to fetch dashboard data");
  }
}

/**
//  * Get user statistics in a single aggregation pipeline
//  */
// export async function getUserStats(
//   db: any,
//   userId: string
// ): Promise<{
//   totalBookings: number;
//   completedBookings: number;
//   cancelledBookings: number;
//   activeBookings: number;
//   totalAmountSpent: number;
//   favoriteCategory?: string;
//   favoriteBrand?: string;
//   memberSince: Date;
// }> {
//   try {
//     const result = await db
//       .collection("bookings")
//       .aggregate([
//         {
//           $match: { userId: userId },
//         },
//         {
//           $group: {
//             _id: null,
//             totalBookings: { $sum: 1 },
//             completedBookings: {
//               $sum: {
//                 $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
//               },
//             },
//             cancelledBookings: {
//               $sum: {
//                 $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
//               },
//             },
//             activeBookings: {
//               $sum: {
//                 $cond: [{ $in: ["$status", ["confirmed", "active"]] }, 1, 0],
//               },
//             },
//             totalAmountSpent: {
//               $sum: {
//                 $cond: [
//                   { $eq: ["$status", "completed"] },
//                   { $ifNull: ["$totalAmount", 0] },
//                   0,
//                 ],
//               },
//             },
//             // Collect all categories and brands from completed bookings
//             allCategories: {
//               $push: {
//                 $cond: [
//                   { $eq: ["$status", "completed"] },
//                   {
//                     $map: {
//                       input: "$vehicles",
//                       as: "vehicle",
//                       in: "$$vehicle.category",
//                     },
//                   },
//                   [],
//                 ],
//               },
//             },
//             allBrands: {
//               $push: {
//                 $cond: [
//                   { $eq: ["$status", "completed"] },
//                   {
//                     $map: {
//                       input: "$vehicles",
//                       as: "vehicle",
//                       in: "$$vehicle.brand",
//                     },
//                   },
//                   [],
//                 ],
//               },
//             },
//             memberSince: { $min: "$createdAt" },
//           },
//         },
//         {
//           $addFields: {
//             // Flatten arrays
//             flatCategories: {
//               $reduce: {
//                 input: "$allCategories",
//                 initialValue: [],
//                 in: { $concatArrays: ["$$value", "$$this"] },
//               },
//             },
//             flatBrands: {
//               $reduce: {
//                 input: "$allBrands",
//                 initialValue: [],
//                 in: { $concatArrays: ["$$value", "$$this"] },
//               },
//             },
//           },
//         },
//         {
//           $addFields: {
//             // Count occurrences of each category and brand
//             categoryGroups: {
//               $reduce: {
//                 input: "$flatCategories",
//                 initialValue: {},
//                 in: {
//                   $mergeObjects: [
//                     "$$value",
//                     {
//                       $arrayToObject: [
//                         [
//                           {
//                             k: "$$this",
//                             v: {
//                               $add: [
//                                 {
//                                   $ifNull: [
//                                     {
//                                       $getField: {
//                                         field: "$$this",
//                                         input: "$$value",
//                                       },
//                                     },
//                                     0,
//                                   ],
//                                 },
//                                 1,
//                               ],
//                             },
//                           },
//                         ],
//                       ],
//                     },
//                   ],
//                 },
//               },
//             },
//             brandGroups: {
//               $reduce: {
//                 input: "$flatBrands",
//                 initialValue: {},
//                 in: {
//                   $mergeObjects: [
//                     "$$value",
//                     {
//                       $arrayToObject: [
//                         [
//                           {
//                             k: "$$this",
//                             v: {
//                               $add: [
//                                 {
//                                   $ifNull: [
//                                     {
//                                       $getField: {
//                                         field: "$$this",
//                                         input: "$$value",
//                                       },
//                                     },
//                                     0,
//                                   ],
//                                 },
//                                 1,
//                               ],
//                             },
//                           },
//                         ],
//                       ],
//                     },
//                   ],
//                 },
//               },
//             },
//           },
//         },
//         {
//           $addFields: {
//             favoriteCategory: {
//               $let: {
//                 vars: {
//                   maxCategoryEntry: {
//                     $arrayElemAt: [
//                       {
//                         $sortArray: {
//                           input: { $objectToArray: "$categoryGroups" },
//                           sortBy: { v: -1 },
//                         },
//                       },
//                       0,
//                     ],
//                   },
//                 },
//                 in: "$$maxCategoryEntry.k",
//               },
//             },
//             favoriteBrand: {
//               $let: {
//                 vars: {
//                   maxBrandEntry: {
//                     $arrayElemAt: [
//                       {
//                         $sortArray: {
//                           input: { $objectToArray: "$brandGroups" },
//                           sortBy: { v: -1 },
//                         },
//                       },
//                       0,
//                     ],
//                   },
//                 },
//                 in: "$$maxBrandEntry.k",
//               },
//             },
//           },
//         },
//         {
//           $project: {
//             _id: 0,
//             totalBookings: 1,
//             completedBookings: 1,
//             cancelledBookings: 1,
//             activeBookings: 1,
//             totalAmountSpent: 1,
//             favoriteCategory: {
//               $cond: {
//                 if: {
//                   $gt: [{ $size: { $objectToArray: "$categoryGroups" } }, 0],
//                 },
//                 then: "$favoriteCategory",
//                 else: "$$REMOVE",
//               },
//             },
//             favoriteBrand: {
//               $cond: {
//                 if: { $gt: [{ $size: { $objectToArray: "$brandGroups" } }, 0] },
//                 then: "$favoriteBrand",
//                 else: "$$REMOVE",
//               },
//             },
//             memberSince: { $ifNull: ["$memberSince", new Date()] },
//           },
//         },
//       ])
//       .toArray();

//     if (result.length === 0) {
//       return {
//         totalBookings: 0,
//         completedBookings: 0,
//         cancelledBookings: 0,
//         activeBookings: 0,
//         totalAmountSpent: 0,
//         memberSince: new Date(),
//       };
//     }

//     return result[0];
//   } catch (error) {
//     console.error("Error fetching user stats:", error);
//     throw new Error("Failed to fetch user statistics");
//   }
// }
