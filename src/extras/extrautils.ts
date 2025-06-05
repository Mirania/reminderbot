import * as discord from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

export async function drawSpeechBubble(attachment: discord.MessageAttachment, format: "gif" | "png", tail: "left" | "right"): Promise<discord.MessageAttachment> {
    const canvas = createCanvas(attachment.width, attachment.height);
    const context = canvas.getContext('2d');

    const imageUpload = await loadImage(attachment.attachment as string);
    context.drawImage(imageUpload, 0, 0, attachment.width, attachment.height);

    //create speech circle
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.ellipse(attachment.width / 2, 0, attachment.height * 0.12278, attachment.width / 2, Math.PI * 1 / 2, 0, 2 * Math.PI);
    context.fill();

    //create speech triangle
    context.beginPath();
    context.moveTo(attachment.width * calculateBubbleTail(0.748, tail), attachment.height * 0.00452);
    context.lineTo(attachment.width * calculateBubbleTail(0.7, tail), attachment.height * 0.259);
    context.lineTo(attachment.width * calculateBubbleTail(0.948, tail), attachment.height * 0.00452);
    context.closePath();
    context.fill();

    const buffer = await canvas.encode('png');
    return new discord.MessageAttachment(buffer, `speech-bubble-${attachment.id}.${format}`);
}

function calculateBubbleTail(coordinates: number, tail: "left" | "right"): number {
    return (tail === "right") ? coordinates : 1 - coordinates;
}
