// import { getCollection } from "../db/database.ts";

// export async function getDashboardData() {
//   try {
//     // Get current year, today, and last 30 days date ranges
//     const now = new Date();
//     const startOfYear = new Date(now.getFullYear(), 0, 1);
//     const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
//     const startOfToday = new Date(
//       now.getFullYear(),
//       now.getMonth(),
//       now.getDate(),
//       0,
//       0,
//       0,
//       0
//     );
//     const endOfToday = new Date(
//       now.getFullYear(),
//       now.getMonth(),
//       now.getDate(),
//       23,
//       59,
//       59,
//       999
//     );
//     const startOfLast30Days = new Date(
//       now.getTime() - 30 * 24 * 60 * 60 * 1000
//     );

//     const paymentsCollection = await getCollection("payments");

//     const pipeline = [
//       // Match payments from current year
//       {
//         $match: {
//           createdAt: { $gte: startOfYear, $lte: endOfYear },
//         },
//       },

//       // Lookup bookings data with safe array handling
//       {
//         $lookup: {
//           from: "bookings",
//           let: { paymentBookingId: "$bookingId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$bookingId", "$$paymentBookingId"] },
//                 createdAt: { $gte: startOfYear, $lte: endOfYear },
//               },
//             },
//           ],
//           as: "bookingData",
//         },
//       },

//       // Lookup user data
//       {
//         $lookup: {
//           from: "users",
//           let: { paymentUserId: "$userId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$userId", "$$paymentUserId"] },
//               },
//             },
//           ],
//           as: "userData",
//         },
//       },

//       // Add contacts with union
//       {
//         $unionWith: {
//           coll: "contacts",
//           pipeline: [
//             {
//               $match: {
//                 createdAt: { $gte: startOfYear, $lte: endOfYear },
//               },
//             },
//             {
//               $addFields: {
//                 dataType: "contact",
//                 amount: 0,
//                 bookingData: [],
//                 userData: [],
//               },
//             },
//           ],
//         },
//       },

//       // Add standalone bookings with union
//       {
//         $unionWith: {
//           coll: "bookings",
//           pipeline: [
//             {
//               $match: {
//                 createdAt: { $gte: startOfYear, $lte: endOfYear },
//               },
//             },
//             {
//               $lookup: {
//                 from: "payments",
//                 let: { bookingId: "$bookingId" },
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: { $eq: ["$bookingId", "$$bookingId"] },
//                     },
//                   },
//                 ],
//                 as: "hasPayment",
//               },
//             },
//             // Only keep bookings without payments
//             {
//               $addFields: {
//                 hasPaymentCount: { $size: { $ifNull: ["$hasPayment", []] } },
//               },
//             },
//             {
//               $match: {
//                 hasPaymentCount: 0,
//               },
//             },
//             {
//               $addFields: {
//                 dataType: "standalone_booking",
//                 amount: { $ifNull: ["$pricing.totalAmount", 0] },
//                 bookingData: [
//                   {
//                     pricing: { $ifNull: ["$pricing", {}] },
//                     bookingStatus: { $ifNull: ["$bookingStatus", "unknown"] },
//                     totalDays: { $ifNull: ["$totalDays", 0] },
//                   },
//                 ],
//                 userData: [],
//               },
//             },
//             // Remove the helper field
//             {
//               $unset: ["hasPayment", "hasPaymentCount"],
//             },
//           ],
//         },
//       },

//       // Add data type and normalize amounts
//       {
//         $addFields: {
//           dataType: {
//             $cond: [
//               { $ne: [{ $ifNull: ["$dataType", null] }, null] },
//               "$dataType",
//               {
//                 $cond: [
//                   { $ne: [{ $ifNull: ["$paymentId", null] }, null] },
//                   "payment",
//                   "unknown",
//                 ],
//               },
//             ],
//           },
//           isToday: {
//             $and: [
//               { $gte: ["$createdAt", startOfToday] },
//               { $lte: ["$createdAt", endOfToday] },
//             ],
//           },
//           isLast30Days: {
//             $and: [
//               { $gte: ["$createdAt", startOfLast30Days] },
//               { $lte: ["$createdAt", new Date()] },
//             ],
//           },
//           normalizedAmount: {
//             $switch: {
//               branches: [
//                 {
//                   case: { $eq: ["$dataType", "payment"] },
//                   then: { $ifNull: ["$amount", 0] },
//                 },
//                 {
//                   case: { $eq: ["$dataType", "standalone_booking"] },
//                   then: { $ifNull: ["$amount", 0] },
//                 },
//                 {
//                   case: {
//                     $and: [
//                       { $ne: ["$dataType", "contact"] },
//                       {
//                         $gt: [{ $size: { $ifNull: ["$bookingData", []] } }, 0],
//                       },
//                     ],
//                   },
//                   then: {
//                     $ifNull: [
//                       { $arrayElemAt: ["$bookingData.pricing.totalAmount", 0] },
//                       0,
//                     ],
//                   },
//                 },
//               ],
//               default: 0,
//             },
//           },
//           normalizedStatus: {
//             $switch: {
//               branches: [
//                 {
//                   case: { $eq: ["$dataType", "payment"] },
//                   then: { $ifNull: ["$status", "unknown"] },
//                 },
//                 {
//                   case: { $eq: ["$dataType", "contact"] },
//                   then: { $ifNull: ["$status", "unknown"] },
//                 },
//                 {
//                   case: { $eq: ["$dataType", "standalone_booking"] },
//                   then: { $ifNull: ["$bookingStatus", "unknown"] },
//                 },
//                 {
//                   case: {
//                     $gt: [{ $size: { $ifNull: ["$bookingData", []] } }, 0],
//                   },
//                   then: {
//                     $ifNull: [
//                       { $arrayElemAt: ["$bookingData.bookingStatus", 0] },
//                       "unknown",
//                     ],
//                   },
//                 },
//               ],
//               default: "unknown",
//             },
//           },
//         },
//       },

//       // Group all data
//       {
//         $group: {
//           _id: null,
//           allData: { $push: "$$ROOT" },
//           rawData: {
//             $push: {
//               dataType: "$dataType",
//               amount: "$normalizedAmount",
//               createdAt: "$createdAt",
//               status: "$normalizedStatus",
//             },
//           },
//         },
//       },

//       // Final projection with safe operations
//       {
//         $project: {
//           _id: 0,
//           summary: {
//             // Basic counts - safe operations
//             totalPayments: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: { $eq: ["$$this.dataType", "payment"] },
//                 },
//               },
//             },
//             totalContacts: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: { $eq: ["$$this.dataType", "contact"] },
//                 },
//               },
//             },
//             totalBookings: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $or: [
//                       { $eq: ["$$this.dataType", "standalone_booking"] },
//                       {
//                         $gt: [
//                           { $size: { $ifNull: ["$$this.bookingData", []] } },
//                           0,
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },

//             // Today counts
//             todayPayments: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       { $eq: ["$$this.dataType", "payment"] },
//                       { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
//                     ],
//                   },
//                 },
//               },
//             },
//             todayContacts: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       { $eq: ["$$this.dataType", "contact"] },
//                       { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
//                     ],
//                   },
//                 },
//               },
//             },
//             todayBookings: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       {
//                         $or: [
//                           { $eq: ["$$this.dataType", "standalone_booking"] },
//                           {
//                             $gt: [
//                               {
//                                 $size: { $ifNull: ["$$this.bookingData", []] },
//                               },
//                               0,
//                             ],
//                           },
//                         ],
//                       },
//                       { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
//                     ],
//                   },
//                 },
//               },
//             },

//             // Revenue calculations
//             totalRevenue: {
//               $sum: {
//                 $map: {
//                   input: {
//                     $filter: {
//                       input: { $ifNull: ["$allData", []] },
//                       cond: {
//                         $or: [
//                           { $eq: ["$$this.dataType", "payment"] },
//                           { $eq: ["$$this.dataType", "standalone_booking"] },
//                           {
//                             $gt: [
//                               {
//                                 $size: { $ifNull: ["$$this.bookingData", []] },
//                               },
//                               0,
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                   },
//                   in: { $ifNull: ["$$this.normalizedAmount", 0] },
//                 },
//               },
//             },
//             todayRevenue: {
//               $sum: {
//                 $map: {
//                   input: {
//                     $filter: {
//                       input: { $ifNull: ["$allData", []] },
//                       cond: {
//                         $and: [
//                           {
//                             $or: [
//                               { $eq: ["$$this.dataType", "payment"] },
//                               {
//                                 $eq: ["$$this.dataType", "standalone_booking"],
//                               },
//                               {
//                                 $gt: [
//                                   {
//                                     $size: {
//                                       $ifNull: ["$$this.bookingData", []],
//                                     },
//                                   },
//                                   0,
//                                 ],
//                               },
//                             ],
//                           },
//                           {
//                             $eq: [{ $ifNull: ["$$this.isToday", false] }, true],
//                           },
//                         ],
//                       },
//                     },
//                   },
//                   in: { $ifNull: ["$$this.normalizedAmount", 0] },
//                 },
//               },
//             },

//             // Status-based counts with safe operations
//             pendingPayments: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       { $eq: ["$$this.dataType", "payment"] },
//                       {
//                         $eq: [
//                           { $ifNull: ["$$this.normalizedStatus", ""] },
//                           "pending",
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//             completedPayments: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       { $eq: ["$$this.dataType", "payment"] },
//                       {
//                         $in: [
//                           { $ifNull: ["$$this.normalizedStatus", ""] },
//                           ["completed", "success"],
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//             activeContacts: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       { $eq: ["$$this.dataType", "contact"] },
//                       {
//                         $eq: [
//                           { $ifNull: ["$$this.normalizedStatus", ""] },
//                           "ACTIVE",
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//             initiatedBookings: {
//               $size: {
//                 $filter: {
//                   input: { $ifNull: ["$allData", []] },
//                   cond: {
//                     $and: [
//                       {
//                         $or: [
//                           { $eq: ["$$this.dataType", "standalone_booking"] },
//                           { $ne: ["$$this.dataType", "payment"] },
//                         ],
//                       },
//                       {
//                         $eq: [
//                           { $ifNull: ["$$this.normalizedStatus", ""] },
//                           "INITIATED",
//                         ],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // Simplified data arrays
//           last30DaysContacts: {
//             $filter: {
//               input: { $ifNull: ["$allData", []] },
//               cond: {
//                 $and: [
//                   { $eq: ["$$this.dataType", "contact"] },
//                   { $eq: [{ $ifNull: ["$$this.isLast30Days", false] }, true] },
//                 ],
//               },
//             },
//           },

//           todayActions: {
//             payments: {
//               $filter: {
//                 input: { $ifNull: ["$allData", []] },
//                 cond: {
//                   $and: [
//                     { $eq: ["$$this.dataType", "payment"] },
//                     { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
//                   ],
//                 },
//               },
//             },
//             bookings: {
//               $filter: {
//                 input: { $ifNull: ["$allData", []] },
//                 cond: {
//                   $and: [
//                     {
//                       $or: [
//                         { $eq: ["$$this.dataType", "standalone_booking"] },
//                         {
//                           $gt: [
//                             { $size: { $ifNull: ["$$this.bookingData", []] } },
//                             0,
//                           ],
//                         },
//                       ],
//                     },
//                     { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
//                   ],
//                 },
//               },
//             },
//             contacts: {
//               $filter: {
//                 input: { $ifNull: ["$allData", []] },
//                 cond: {
//                   $and: [
//                     { $eq: ["$$this.dataType", "contact"] },
//                     { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
//                   ],
//                 },
//               },
//             },
//           },

//           // Raw chart data
//           chartData: { $ifNull: ["$rawData", []] },
//         },
//       },
//     ];

//     const result = await paymentsCollection.aggregate(pipeline).toArray();

//     return (
//       result[0] || {
//         summary: {
//           totalPayments: 0,
//           totalBookings: 0,
//           totalContacts: 0,
//           todayPayments: 0,
//           todayBookings: 0,
//           todayContacts: 0,
//           totalRevenue: 0,
//           todayRevenue: 0,
//           pendingPayments: 0,
//           completedPayments: 0,
//           activeContacts: 0,
//           initiatedBookings: 0,
//         },
//         last30DaysContacts: [],
//         todayActions: {
//           payments: [],
//           bookings: [],
//           contacts: [],
//         },
//         chartData: [],
//       }
//     );
//   } catch (error: any) {
//     console.error("Dashboard data fetch error:", error);
//     throw new Error("Error fetching dashboard data: " + error.message);
//   }
// }

import { getCollection } from "../db/database.ts";

export async function getDashboardData() {
  try {
    // Get current year, today, and last 30 days date ranges
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    const startOfLast30Days = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    const paymentsCollection = await getCollection("payments");

    const pipeline = [
      // Match payments from current year
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },

      // Lookup bookings data with safe array handling
      {
        $lookup: {
          from: "bookings",
          let: { paymentBookingId: "$bookingId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$bookingId", "$$paymentBookingId"] },
                createdAt: { $gte: startOfYear, $lte: endOfYear },
              },
            },
          ],
          as: "bookingData",
        },
      },

      // Lookup user data
      {
        $lookup: {
          from: "users",
          let: { paymentUserId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$paymentUserId"] },
              },
            },
          ],
          as: "userData",
        },
      },

      // Add contacts with union
      {
        $unionWith: {
          coll: "contact",
          pipeline: [
            {
              $match: {
                createdAt: { $gte: startOfYear, $lte: endOfYear },
              },
            },
            {
              $addFields: {
                dataType: "contact",
                amount: 0,
                bookingData: [],
                userData: [],
              },
            },
          ],
        },
      },

      // Add standalone bookings with union
      {
        $unionWith: {
          coll: "bookings",
          pipeline: [
            {
              $match: {
                createdAt: { $gte: startOfYear, $lte: endOfYear },
              },
            },
            {
              $lookup: {
                from: "payments",
                let: { bookingId: "$bookingId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$bookingId", "$$bookingId"] },
                    },
                  },
                ],
                as: "hasPayment",
              },
            },
            // Only keep bookings without payments
            {
              $addFields: {
                hasPaymentCount: { $size: { $ifNull: ["$hasPayment", []] } },
              },
            },
            {
              $match: {
                hasPaymentCount: 0,
              },
            },
            {
              $addFields: {
                dataType: "standalone_booking",
                amount: { $ifNull: ["$pricing.totalAmount", 0] },
                bookingData: [
                  {
                    pricing: { $ifNull: ["$pricing", {}] },
                    bookingStatus: { $ifNull: ["$bookingStatus", "unknown"] },
                    totalDays: { $ifNull: ["$totalDays", 0] },
                  },
                ],
                userData: [],
              },
            },
            // Remove the helper field
            {
              $unset: ["hasPayment", "hasPaymentCount"],
            },
          ],
        },
      },

      // Add data type and normalize amounts
      {
        $addFields: {
          dataType: {
            $cond: [
              { $ne: [{ $ifNull: ["$dataType", null] }, null] },
              "$dataType",
              {
                $cond: [
                  { $ne: [{ $ifNull: ["$paymentId", null] }, null] },
                  "payment",
                  "unknown",
                ],
              },
            ],
          },
          isToday: {
            $and: [
              { $gte: ["$createdAt", startOfToday] },
              { $lte: ["$createdAt", endOfToday] },
            ],
          },
          isLast30Days: {
            $and: [
              { $gte: ["$createdAt", startOfLast30Days] },
              { $lte: ["$createdAt", new Date()] },
            ],
          },
          normalizedAmount: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$dataType", "payment"] },
                  then: { $ifNull: ["$amount", 0] },
                },
                {
                  case: { $eq: ["$dataType", "standalone_booking"] },
                  then: { $ifNull: ["$amount", 0] },
                },
                {
                  case: {
                    $and: [
                      { $ne: ["$dataType", "contact"] },
                      {
                        $gt: [{ $size: { $ifNull: ["$bookingData", []] } }, 0],
                      },
                    ],
                  },
                  then: {
                    $ifNull: [
                      { $arrayElemAt: ["$bookingData.pricing.totalAmount", 0] },
                      0,
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
          normalizedStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$dataType", "payment"] },
                  then: { $ifNull: ["$status", "unknown"] },
                },
                {
                  case: { $eq: ["$dataType", "contact"] },
                  then: { $ifNull: ["$status", "unknown"] },
                },
                {
                  case: { $eq: ["$dataType", "standalone_booking"] },
                  then: { $ifNull: ["$bookingStatus", "unknown"] },
                },
                {
                  case: {
                    $gt: [{ $size: { $ifNull: ["$bookingData", []] } }, 0],
                  },
                  then: {
                    $ifNull: [
                      { $arrayElemAt: ["$bookingData.bookingStatus", 0] },
                      "unknown",
                    ],
                  },
                },
              ],
              default: "unknown",
            },
          },
        },
      },

      // Group all data
      {
        $group: {
          _id: null,
          allData: { $push: "$$ROOT" },
          rawData: {
            $push: {
              dataType: "$dataType",
              amount: "$normalizedAmount",
              createdAt: "$createdAt",
              status: "$normalizedStatus",
            },
          },
        },
      },

      // Final projection with safe operations and enhanced data formatting
      {
        $project: {
          _id: 0,
          summary: {
            // Basic counts - safe operations
            totalPayments: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: { $eq: ["$$this.dataType", "payment"] },
                },
              },
            },
            totalContacts: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: { $eq: ["$$this.dataType", "contact"] },
                },
              },
            },
            totalBookings: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $or: [
                      { $eq: ["$$this.dataType", "standalone_booking"] },
                      {
                        $gt: [
                          { $size: { $ifNull: ["$$this.bookingData", []] } },
                          0,
                        ],
                      },
                    ],
                  },
                },
              },
            },

            // Today counts
            todayPayments: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      { $eq: ["$$this.dataType", "payment"] },
                      { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
                    ],
                  },
                },
              },
            },
            todayContacts: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      { $eq: ["$$this.dataType", "contact"] },
                      { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
                    ],
                  },
                },
              },
            },
            todayBookings: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      {
                        $or: [
                          { $eq: ["$$this.dataType", "standalone_booking"] },
                          {
                            $gt: [
                              {
                                $size: { $ifNull: ["$$this.bookingData", []] },
                              },
                              0,
                            ],
                          },
                        ],
                      },
                      { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
                    ],
                  },
                },
              },
            },

            // Revenue calculations
            totalRevenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ["$allData", []] },
                      cond: {
                        $or: [
                          { $eq: ["$$this.dataType", "payment"] },
                          { $eq: ["$$this.dataType", "standalone_booking"] },
                          {
                            $gt: [
                              {
                                $size: { $ifNull: ["$$this.bookingData", []] },
                              },
                              0,
                            ],
                          },
                        ],
                      },
                    },
                  },
                  in: { $ifNull: ["$$this.normalizedAmount", 0] },
                },
              },
            },
            todayRevenue: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ["$allData", []] },
                      cond: {
                        $and: [
                          {
                            $or: [
                              { $eq: ["$$this.dataType", "payment"] },
                              {
                                $eq: ["$$this.dataType", "standalone_booking"],
                              },
                              {
                                $gt: [
                                  {
                                    $size: {
                                      $ifNull: ["$$this.bookingData", []],
                                    },
                                  },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $eq: [{ $ifNull: ["$$this.isToday", false] }, true],
                          },
                        ],
                      },
                    },
                  },
                  in: { $ifNull: ["$$this.normalizedAmount", 0] },
                },
              },
            },

            // Status-based counts with safe operations
            pendingPayments: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      { $eq: ["$$this.dataType", "payment"] },
                      {
                        $eq: [
                          { $ifNull: ["$$this.normalizedStatus", ""] },
                          "pending",
                        ],
                      },
                    ],
                  },
                },
              },
            },
            completedPayments: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      { $eq: ["$$this.dataType", "payment"] },
                      {
                        $in: [
                          { $ifNull: ["$$this.normalizedStatus", ""] },
                          ["completed", "success"],
                        ],
                      },
                    ],
                  },
                },
              },
            },
            activeContacts: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      { $eq: ["$$this.dataType", "contact"] },
                      {
                        $eq: [
                          { $ifNull: ["$$this.normalizedStatus", ""] },
                          "ACTIVE",
                        ],
                      },
                    ],
                  },
                },
              },
            },
            initiatedBookings: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      {
                        $or: [
                          { $eq: ["$$this.dataType", "standalone_booking"] },
                          { $ne: ["$$this.dataType", "payment"] },
                        ],
                      },
                      {
                        $eq: [
                          { $ifNull: ["$$this.normalizedStatus", ""] },
                          "INITIATED",
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },

          // Enhanced projections for last30DaysContacts with clean data structure
          last30DaysContacts: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ["$allData", []] },
                  cond: {
                    $and: [
                      { $eq: ["$$this.dataType", "contact"] },
                      {
                        $eq: [
                          { $ifNull: ["$$this.isLast30Days", false] },
                          true,
                        ],
                      },
                    ],
                  },
                },
              },
              in: {
                id: { $ifNull: ["$$this.contactId", "$$this._id"] },
                name: { $ifNull: ["$$this.name", "Unknown"] },
                email: { $ifNull: ["$$this.email", ""] },
                phone: { $ifNull: ["$$this.phone", ""] },
                status: { $ifNull: ["$$this.normalizedStatus", "unknown"] },
                createdAt: "$$this.createdAt",
                source: { $ifNull: ["$$this.source", "direct"] },
                tags: { $ifNull: ["$$this.tags", []] },
              },
            },
          },

          // Enhanced todayActions with structured data
          todayActions: {
            payments: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$allData", []] },
                    cond: {
                      $and: [
                        { $eq: ["$$this.dataType", "payment"] },
                        { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
                      ],
                    },
                  },
                },
                in: {
                  id: { $ifNull: ["$$this.paymentId", "$$this._id"] },
                  amount: { $ifNull: ["$$this.normalizedAmount", 0] },
                  status: { $ifNull: ["$$this.normalizedStatus", "unknown"] },
                  method: { $ifNull: ["$$this.paymentMethod", "unknown"] },
                  bookingId: { $ifNull: ["$$this.bookingId", null] },
                  userId: { $ifNull: ["$$this.userId", null] },
                  createdAt: "$$this.createdAt",
                  currency: { $ifNull: ["$$this.currency", "INR"] },
                },
              },
            },
            bookings: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$allData", []] },
                    cond: {
                      $and: [
                        {
                          $or: [
                            { $eq: ["$$this.dataType", "standalone_booking"] },
                            {
                              $gt: [
                                {
                                  $size: {
                                    $ifNull: ["$$this.bookingData", []],
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
                      ],
                    },
                  },
                },
                in: {
                  id: { $ifNull: ["$$this.bookingId", "$$this._id"] },
                  status: { $ifNull: ["$$this.normalizedStatus", "unknown"] },
                  amount: { $ifNull: ["$$this.normalizedAmount", 0] },
                  userId: { $ifNull: ["$$this.userId", null] },
                  createdAt: "$$this.createdAt",
                  totalDays: {
                    $cond: [
                      { $eq: ["$$this.dataType", "standalone_booking"] },
                      { $ifNull: ["$$this.totalDays", 0] },
                      {
                        $ifNull: [
                          { $arrayElemAt: ["$$this.bookingData.totalDays", 0] },
                          0,
                        ],
                      },
                    ],
                  },
                  destination: { $ifNull: ["$$this.destination", "Unknown"] },
                  checkIn: { $ifNull: ["$$this.checkInDate", null] },
                  checkOut: { $ifNull: ["$$this.checkOutDate", null] },
                },
              },
            },
            contacts: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$allData", []] },
                    cond: {
                      $and: [
                        { $eq: ["$$this.dataType", "contact"] },
                        { $eq: [{ $ifNull: ["$$this.isToday", false] }, true] },
                      ],
                    },
                  },
                },
                in: {
                  id: { $ifNull: ["$$this.contactId", "$$this._id"] },
                  name: { $ifNull: ["$$this.name", "Unknown"] },
                  email: { $ifNull: ["$$this.email", ""] },
                  phone: { $ifNull: ["$$this.phone", ""] },
                  status: { $ifNull: ["$$this.normalizedStatus", "unknown"] },
                  createdAt: "$$this.createdAt",
                  source: { $ifNull: ["$$this.source", "direct"] },
                  leadScore: { $ifNull: ["$$this.leadScore", 0] },
                },
              },
            },
          },

          // Enhanced chart data with better structure for visualization
          chartData: {
            $map: {
              input: { $ifNull: ["$rawData", []] },
              in: {
                type: "$$this.dataType",
                amount: { $ifNull: ["$$this.amount", 0] },
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$$this.createdAt",
                  },
                },
                timestamp: "$$this.createdAt",
                status: { $ifNull: ["$$this.status", "unknown"] },
                month: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: "$$this.createdAt",
                  },
                },
                dayOfWeek: {
                  $dayOfWeek: "$$this.createdAt",
                },
              },
            },
          },

          // Additional analytics projections
          analytics: {
            // Monthly revenue breakdown
            monthlyRevenue: {
              $let: {
                vars: {
                  revenueData: {
                    $filter: {
                      input: { $ifNull: ["$allData", []] },
                      cond: {
                        $and: [
                          { $gt: ["$$this.normalizedAmount", 0] },
                          {
                            $or: [
                              { $eq: ["$$this.dataType", "payment"] },
                              {
                                $eq: ["$$this.dataType", "standalone_booking"],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                in: {
                  $map: {
                    input: "$$revenueData",
                    in: {
                      month: {
                        $dateToString: {
                          format: "%Y-%m",
                          date: "$$this.createdAt",
                        },
                      },
                      amount: { $ifNull: ["$$this.normalizedAmount", 0] },
                      count: 1,
                    },
                  },
                },
              },
            },

            // User engagement data
            userEngagement: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$allData", []] },
                    cond: {
                      $gt: [{ $size: { $ifNull: ["$$this.userData", []] } }, 0],
                    },
                  },
                },
                in: {
                  userId: {
                    $ifNull: [
                      { $arrayElemAt: ["$$this.userData.userId", 0] },
                      null,
                    ],
                  },
                  userName: {
                    $ifNull: [
                      { $arrayElemAt: ["$$this.userData.name", 0] },
                      "Unknown",
                    ],
                  },
                  email: {
                    $ifNull: [
                      { $arrayElemAt: ["$$this.userData.email", 0] },
                      "",
                    ],
                  },
                  totalSpent: { $ifNull: ["$$this.normalizedAmount", 0] },
                  lastActivity: "$$this.createdAt",
                  dataType: "$$this.dataType",
                },
              },
            },

            // Status distribution
            statusDistribution: {
              payments: {
                $reduce: {
                  input: {
                    $filter: {
                      input: { $ifNull: ["$allData", []] },
                      cond: { $eq: ["$$this.dataType", "payment"] },
                    },
                  },
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      "$$value",
                      {
                        $arrayToObject: [
                          [
                            {
                              k: {
                                $ifNull: ["$$this.normalizedStatus", "unknown"],
                              },
                              v: {
                                $add: [
                                  {
                                    $ifNull: [
                                      {
                                        $getField: {
                                          field: {
                                            $ifNull: [
                                              "$$this.normalizedStatus",
                                              "unknown",
                                            ],
                                          },
                                          input: "$$value",
                                        },
                                      },
                                      0,
                                    ],
                                  },
                                  1,
                                ],
                              },
                            },
                          ],
                        ],
                      },
                    ],
                  },
                },
              },
              bookings: {
                $reduce: {
                  input: {
                    $filter: {
                      input: { $ifNull: ["$allData", []] },
                      cond: {
                        $or: [
                          { $eq: ["$$this.dataType", "standalone_booking"] },
                          {
                            $gt: [
                              {
                                $size: { $ifNull: ["$$this.bookingData", []] },
                              },
                              0,
                            ],
                          },
                        ],
                      },
                    },
                  },
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      "$$value",
                      {
                        $arrayToObject: [
                          [
                            {
                              k: {
                                $ifNull: ["$$this.normalizedStatus", "unknown"],
                              },
                              v: {
                                $add: [
                                  {
                                    $ifNull: [
                                      {
                                        $getField: {
                                          field: {
                                            $ifNull: [
                                              "$$this.normalizedStatus",
                                              "unknown",
                                            ],
                                          },
                                          input: "$$value",
                                        },
                                      },
                                      0,
                                    ],
                                  },
                                  1,
                                ],
                              },
                            },
                          ],
                        ],
                      },
                    ],
                  },
                },
              },
              contacts: {
                $reduce: {
                  input: {
                    $filter: {
                      input: { $ifNull: ["$allData", []] },
                      cond: { $eq: ["$$this.dataType", "contact"] },
                    },
                  },
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      "$$value",
                      {
                        $arrayToObject: [
                          [
                            {
                              k: {
                                $ifNull: ["$$this.normalizedStatus", "unknown"],
                              },
                              v: {
                                $add: [
                                  {
                                    $ifNull: [
                                      {
                                        $getField: {
                                          field: {
                                            $ifNull: [
                                              "$$this.normalizedStatus",
                                              "unknown",
                                            ],
                                          },
                                          input: "$$value",
                                        },
                                      },
                                      0,
                                    ],
                                  },
                                  1,
                                ],
                              },
                            },
                          ],
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },

          // Metadata for the response
          metadata: {
            generatedAt: new Date(),
            dateRange: {
              startOfYear: startOfYear,
              endOfYear: endOfYear,
              startOfToday: startOfToday,
              endOfToday: endOfToday,
              startOfLast30Days: startOfLast30Days,
            },
            totalRecords: { $size: { $ifNull: ["$allData", []] } },
          },
        },
      },
    ];

    const result = await paymentsCollection.aggregate(pipeline).toArray();

    return (
      result[0] || {
        summary: {
          totalPayments: 0,
          totalBookings: 0,
          totalContacts: 0,
          todayPayments: 0,
          todayBookings: 0,
          todayContacts: 0,
          totalRevenue: 0,
          todayRevenue: 0,
          pendingPayments: 0,
          completedPayments: 0,
          activeContacts: 0,
          initiatedBookings: 0,
        },
        last30DaysContacts: [],
        todayActions: {
          payments: [],
          bookings: [],
          contacts: [],
        },
        chartData: [],
        analytics: {
          monthlyRevenue: [],
          userEngagement: [],
          statusDistribution: {
            payments: {},
            bookings: {},
            contacts: {},
          },
        },
        metadata: {
          generatedAt: new Date(),
          dateRange: {
            startOfYear,
            endOfYear,
            startOfToday,
            endOfToday,
            startOfLast30Days,
          },
          totalRecords: 0,
        },
      }
    );
  } catch (error: any) {
    console.error("Dashboard data fetch error:", error);
    throw new Error("Error fetching dashboard data: " + error.message);
  }
}
