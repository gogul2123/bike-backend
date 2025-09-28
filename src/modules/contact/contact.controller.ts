import { Contact, ContactInput } from "./contact.model.ts";
import { Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response.ts";
import { getCollection } from "../db/database.ts";
import { parse } from "path";
import { sendMail } from "../../services/gmail.service.ts";
import { send } from "process";
import { generateNumericEpochId } from "../../utils/generator.ts";

export const contactHandler = async (req: Request, res: Response) => {
  const { name, email, subject, message, phone } = req.body as ContactInput;
  try {
    const contactCol = await getCollection("contact");
    const contact = await contactCol.findOne({
      $or: [{ email: email }, { phone: phone }],
      status: "ACTIVE",
    });
    if (contact) {
      sendError(res, 400, "Already Data submitted");
      return;
    }
    const result = await contactCol.insertOne({
      contactId: generateNumericEpochId("CONT"),
      name,
      email,
      subject,
      message,
      phone,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Contact);

    if (!result.acknowledged) {
      sendError(res, 400, "Error creating contact");
      return;
    }
    sendSuccess(res, 201, "Contact created successfully");
  } catch (error) {
    sendError(res, 500, "Internal server error");
    return;
  }
};

export const getContactHandler = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status = "ALL" } = req.query;
    const contactCol = await getCollection("contact");
    const matchStage: any = {};

    if (status && status !== "ALL") {
      matchStage.status = status; // dynamic status filter
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            {
              $skip: (parseInt(page as string) - 1) * parseInt(limit as string),
            },
            { $limit: parseInt(limit as string) },
            {
              $project: {
                _id: 0,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
          totalPages: {
            $ceil: {
              $divide: [
                { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
                parseInt(limit as string),
              ],
            },
          },
        },
      },
    ];

    const result = await contactCol.aggregate(pipeline).toArray();
    return result[0];
  } catch (error) {}
};

export const replyContactHandler = async (req: Request, res: Response) => {
  const { contactId, message, email } = req.body;

  try {
    const contactCol = await getCollection("contact");

    // Find and update in one go
    const result = await contactCol.findOneAndUpdate(
      { _id: contactId },
      {
        $set: {
          status: "REPLIED",
          reply: message,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" } // return updated doc
    );

    if (!result.value) {
      sendError(res, 404, "Contact not found or update failed");
      return;
    }

    // Send email after successful update
    const mailResult = await sendMail(email, message);
    if (!mailResult.success) {
      sendError(res, 400, "Error sending email");
      return;
    }

    sendSuccess(res, 200, "Contact replied successfully");
  } catch (error) {
    console.error("replyContactHandler error:", error);
    sendError(res, 500, "Internal server error");
  }
};

export const getContactByIdHandler = async (req: Request, res: Response) => {
  const { contactId } = req.params;
  try {
    const contactCol = await getCollection("contact");
    const result = await contactCol.findOne(
      { contactId },
      { projection: { _id: 0 } }
    );
    if (!result) {
      sendError(res, 404, "Contact not found");
      return;
    }
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, 500, "Internal server error");
  }
};
