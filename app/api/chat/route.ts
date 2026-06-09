import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
    try{
        const { messages } = await req.json();

        if(!messages || messages.length === 0){
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }
        return Response.json({ message: `You said: ${messages}`});
    } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};