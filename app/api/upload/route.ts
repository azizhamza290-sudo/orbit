import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/utils";

const MAX_SIZE = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    console.log("UPLOAD START");

    const user = await requireUser();

    console.log("USER OK:", user.id);

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.log("NO FILE");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("FILE:", file.name, file.type, file.size);


    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 413 }
      );
    }


    const safeName = file.name.replace(/[^\w.\-() ]/g, "_");


    console.log("START BLOB");


    const blob = await put(
      `uploads/${user.id}/${randomToken(8)}-${safeName}`,
      file,
      {
        access: "public",
        contentType: file.type,
      }
    );


    console.log("BLOB OK:", blob.url);


    const attachment = await db.attachment.create({
      data: {
        uploaderId: user.id,
        url: blob.url,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      },
    });


    console.log("DB OK");


    return NextResponse.json(
      {
        attachment,
      },
      {
        status: 201,
      }
    );


  } catch (error) {

    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown upload error",
      },
      {
        status: 500,
      }
    );
  }
}
