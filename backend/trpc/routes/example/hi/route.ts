import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const hiProcedure = publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }) => {
    return {
      hello: input.name,
      date: new Date(),
    };
  });

export const uploadImageProcedure = publicProcedure
  .input(
    z.object({
      imageBase64: z.string(),
      filename: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Here you could save the image to a cloud storage service
    // For now, we'll just return a success message
    console.log(`Received image upload: ${input.filename || 'unnamed'} (${input.imageBase64.length} chars)`);
    
    return {
      success: true,
      message: "Image uploaded successfully",
      imageId: `img_${Date.now()}`,
    };
  });

export default hiProcedure;