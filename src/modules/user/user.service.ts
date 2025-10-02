// modules/auth/user.service.ts

import bcrypt from "bcrypt"; // Import bcrypt for password hashing
import {
  User,
  SignUpInput,
  UpdateUserInput,
  UpdateInitialDataInput,
} from "./user.model.ts";
import { getCollection } from "../db/database.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { sendError } from "../../utils/response.ts";
import { stat } from "fs";

const SALT_ROUNDS = 10;

// export async function getOrCreateUser(
//   data: SignUpInput,
//   role: "user" | "admin" = "user"
// ): Promise<User | null> {
//   const col = await getCollection("users");

//   // Check if user exists
//   let user = await col.findOne({
//     $or: [{ email: data.email }, { mobile: data.mobile }],
//   });

//   if (!user) {
//     // Hash password before storing
//     const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
//     data.password = hashedPassword;
//     const newUser = {
//       userId: generateNumericEpochId("USR"),
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       role: role,
//       status: "inactive" as const,
//       ...data,
//     };

//     await col.insertOne(newUser);

//     return newUser;
//   }

//   return user;
// }

export async function getOrCreateUser(
  email: string,
  role: "user" | "admin" = "user"
): Promise<any | null> {
  const col = await getCollection("users");

  // Check if user exists
  let user = await col.findOne(
    { email },
    {
      projection: {
        _id: 0,
        address: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    }
  );

  if (!user) {
    const newUser = {
      userId: generateNumericEpochId("USR"),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: role,
      status: "inactive" as const,
      email,
      name: "",
      mobile: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
    };

    await col.insertOne(newUser);

    return {
      name: newUser.name,
      email: newUser.email,
      userId: newUser.userId,
      role: newUser.role,
      status: newUser.status,
      mobile: newUser.mobile,
    };
  }
  return user;
}

export async function updateUserInitialData(
  data: UpdateInitialDataInput
): Promise<any | null> {
  const col = await getCollection("users");
  const result = await col.updateOne(
    { userId: data.userId },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
        status: "active",
      },
    }
  );
  return result;
}

export async function updateUser(data: UpdateUserInput): Promise<any | null> {
  const col = await getCollection("users");

  const result = await col.updateOne(
    { userId: data.userId },
    { $set: { ...data, updatedAt: new Date() } }
  );
  const userData = await getUserByID(data.userId);
  console.log("result", result);
  console.log("userData", userData);
  if (result.modifiedCount === 0) {
    throw new Error("User not found or no changes made");
  }
  return result;
}

export async function getUserByID(
  userId: string,
  projection?: Record<string, any>
): Promise<User | null | any> {
  const col = await getCollection("users");

  const pipeline = [
    { $match: { userId } },

    // Lookup bookings
    {
      $lookup: {
        from: "bookings",
        let: { userIdVar: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userIdVar"] },
                  {
                    $in: [
                      "$bookingStatus",
                      ["CONFIRMED", "COMPLETED", "DELIVERED"],
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "userBookings",
      },
    },

    // Lookup payments
    {
      $lookup: {
        from: "payments",
        let: { userIdVar: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userIdVar"] },
                  { $eq: ["$status", "SUCCESS"] },
                ],
              },
            },
          },
        ],
        as: "userPayments",
      },
    },

    // Compute totals
    {
      $addFields: {
        totalBookings: { $size: "$userBookings" },
        totalPaymentAmount: {
          $sum: {
            $map: {
              input: "$userPayments",
              as: "p",
              in: "$$p.totalAmount",
            },
          },
        },
      },
    },

    {
      $project: {
        password: 0,
        _id: 0,
      },
    },
  ];

  const result = await col.aggregate(pipeline).toArray();
  return result.length > 0 ? result[0] : null;
}

// export async function getUserByID(
//   userId: string,
//   projection?: Record<string, any>
// ): Promise<User | null | any> {
//   const col = await getCollection("users");
//   const colData = await getCollection("bookings");
//   const colPayment = await getCollection("payments");

//   // Debug: Check what we're searching for
//   console.log("Searching for userId:", userId, "Type:", typeof userId);
//   const payment = await colPayment.find({ userId }).toArray();
//   const booking = await colData.find({ userId }).toArray();
//   console.log("payment", payment);
//   //console.log("booking", booking);

//   const pipeline = [
//     { $match: { userId } },

//     {
//       $lookup: {
//         from: "bookings",
//         let: { uid: "$userId" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$userId", "$$uid"] },
//                   {
//                     $in: [
//                       "$bookingStatus",
//                       ["CONFIRMED", "COMPLETED", "DELIVERED"],
//                     ],
//                   },
//                 ],
//               },
//             },
//           },
//         ],
//         as: "userBookings",
//       },
//     },
//     {
//       $lookup: {
//         from: "payments",
//         let: { uid: "$userId" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$userId", "$$uid"] },
//                   { $eq: ["$status", "SUCCESS"] },
//                 ],
//               },
//             },
//           },
//         ],
//         as: "userPayments",
//       },
//     },

//     // Debug: Add this stage temporarily to see what's in the lookup
//     {
//       $addFields: {
//         debugUserId: "$userId",
//         debugBookingsCount: { $size: "$userBookings" },
//         debugPaymentsCount: { $size: "$userPayments" },
//       },
//     },

//     {
//       $addFields: {
//         totalBookings: { $size: "$userBookings" },
//         totalPaymentAmount: { $sum: "$userPayments.totalAmount" },
//         totalPaidAmount: { $sum: "$userPayments.paidAmount" },
//         totalAdvanceAmount: { $sum: "$userPayments.advanceAmount" },
//         totalRemainingAmount: { $sum: "$userPayments.remainingAmount" },
//       },
//     },
//     {
//       $project: {
//         password: 0,
//         _id: 0,
//       },
//     },
//   ];

//   const result = await col.aggregate(pipeline).toArray();

//   // Debug: Log the result
//   console.log("Result:", JSON.stringify(result, null, 2));

//   return result.length > 0 ? result[0] : null;
// }

// export async function getAllUsers(data?: {
//   search?: string;
//   status?: string;
//   page?: number;
//   limit?: number;
// }): Promise<any[]> {
//   const col = await getCollection("users");
//   const users = await col.find({}).toArray();
//   return users;
// }

export async function getAllUsers(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  userCount: number;
  activeUserCount: number;
  inactiveUserCount: number;
  users: any[];
}> {
  const col = await getCollection("users");

  const { search = "", status, page = 1, limit = 10 } = params || {};

  // Build match stage
  const matchStage: any = {};

  if (search) {
    matchStage.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    matchStage.status = status;
  }

  const pipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $facet: {
        metadata: [
          { $count: "userCount" },
          {
            $addFields: {
              activeUserCount: {
                $cond: [{ $eq: [status, "active"] }, "$userCount", 0],
              },
              inactiveUserCount: {
                $cond: [{ $eq: [status, "inactive"] }, "$userCount", 0],
              },
            },
          },
        ],
        counts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: {
                $sum: {
                  $cond: [{ $eq: ["$status", "active"] }, 1, 0],
                },
              },
              inactive: {
                $sum: {
                  $cond: [{ $eq: ["$status", "inactive"] }, 1, 0],
                },
              },
            },
          },
        ],
        users: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      },
    },
    {
      $project: {
        userCount: { $arrayElemAt: ["$counts.total", 0] },
        activeUserCount: { $arrayElemAt: ["$counts.active", 0] },
        inactiveUserCount: { $arrayElemAt: ["$counts.inactive", 0] },
        users: 1,
      },
    },
  ];

  const result = await col.aggregate(pipeline).toArray();

  if (result.length === 0) {
    return {
      userCount: 0,
      activeUserCount: 0,
      inactiveUserCount: 0,
      users: [],
    };
  }

  return {
    userCount: result[0].userCount || 0,
    activeUserCount: result[0].activeUserCount || 0,
    inactiveUserCount: result[0].inactiveUserCount || 0,
    users: result[0].users || [],
  };
}
