import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createBoardPostSchema,
  updateBoardPostSchema,
  updateBoardPostPositionSchema,
} from '@/lib/validations/board';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const posts = await prisma.boardPost.findMany({
      orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }],
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('[GET /api/board] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBoardPostSchema.parse(body);

    // Find the next available position in the grid (4 columns for lg breakpoint)
    const existingPosts = await prisma.boardPost.findMany({
      orderBy: [{ gridY: 'desc' }, { gridX: 'desc' }],
      select: { gridX: true, gridY: true },
    });

    // Find the first empty slot, starting from top-left
    let gridX = 0;
    let gridY = 0;
    const cols = 4; // lg breakpoint columns

    if (existingPosts.length > 0) {
      // Find the last position
      const lastPost = existingPosts[0];
      gridX = (lastPost.gridX + 1) % cols;
      gridY = lastPost.gridY + Math.floor((lastPost.gridX + 1) / cols);
    }

    const post = await prisma.boardPost.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        gridX,
        gridY,
        createdBy: session.user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('[POST /api/board] Error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateBoardPostSchema.parse(body);

    // Check if post exists and user owns it
    const existingPost = await prisma.boardPost.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: {
      title?: string;
      description?: string;
    } = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    const post = await prisma.boardPost.update({
      where: { id: validatedData.id },
      data: updateData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('[PUT /api/board] Error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateBoardPostPositionSchema.parse(body);

    // Update all posts in a transaction
    await prisma.$transaction(
      validatedData.map(({ id, gridX, gridY }) =>
        prisma.boardPost.update({
          where: { id },
          data: { gridX, gridY },
        })
      )
    );

    // Fetch updated posts with relations
    const posts = await prisma.boardPost.findMany({
      where: {
        id: { in: validatedData.map((d) => d.id) },
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('[PATCH /api/board] Error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Check if post exists and user owns it
    const existingPost = await prisma.boardPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.boardPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/board] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
