import { NextRequest, NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.image) {
      // Handle image input
      console.log('Received image file name:', body.fileName);
      console.log('Received image file type:', body.fileType);
      // Here you would typically process the image
      // The base64 image data is in body.image
      const solution = `Solution based on image analysis of ${body.fileName}

Step 1: Analyze the image

Step 2: Identify the mathematical problem

Step 3: Solve the problem

Final Answer: $x = 5$`;
      return NextResponse.json({ solution });
    } else if (body.input) {
      // Handle text input
      console.log('Received problem:', body.input);
      const solution = `To solve the mathematical expression $${body.input}$, we follow these steps:

Step 1: Identify the operations in the expression
$${body.input}$

Step 2: Apply the order of operations (PEMDAS)
First, we need to evaluate $3 \\div \\frac{1}{3}$

Step 3: Perform calculations step by step
$3 \\div \\frac{1}{3} = 3 \\times 3 = 9$
Now our expression becomes: $9 - 9 + 1$

Step 4: Perform subtraction and addition from left to right
$9 - 9 = 0$
$0 + 1 = 1$

Final Answer: $1$`;
      return NextResponse.json({ solution });
    } else {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 400 });
  }
}