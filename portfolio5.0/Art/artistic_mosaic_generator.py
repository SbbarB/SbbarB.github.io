#!/usr/bin/env python3
"""
Artistic Mosaic Generator
Creates beautiful mosaic art from images using colored tiles or pixel blocks.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import argparse
import os
from typing import Tuple, List
import colorsys


class MosaicGenerator:
    """Generate artistic mosaics from images."""

    def __init__(self, tile_size: int = 20, color_palette: str = 'vibrant'):
        """
        Initialize the mosaic generator.

        Args:
            tile_size: Size of each mosaic tile in pixels
            color_palette: Color palette to use ('vibrant', 'pastel', 'monochrome', 'rainbow')
        """
        self.tile_size = tile_size
        self.color_palette = color_palette
        self.palette_colors = self._generate_palette()

    def _generate_palette(self) -> List[Tuple[int, int, int]]:
        """Generate color palette based on selected style."""
        if self.color_palette == 'vibrant':
            return [
                (255, 0, 0), (0, 255, 0), (0, 0, 255),
                (255, 255, 0), (255, 0, 255), (0, 255, 255),
                (255, 128, 0), (128, 0, 255), (0, 255, 128),
                (255, 0, 128), (128, 255, 0), (0, 128, 255),
                (255, 255, 255), (0, 0, 0), (128, 128, 128)
            ]
        elif self.color_palette == 'pastel':
            return [
                (255, 182, 193), (255, 218, 185), (255, 255, 224),
                (224, 255, 255), (230, 230, 250), (255, 240, 245),
                (245, 255, 250), (255, 228, 225), (240, 248, 255),
                (248, 248, 255), (255, 250, 240), (245, 245, 245)
            ]
        elif self.color_palette == 'monochrome':
            return [(i, i, i) for i in range(0, 256, 25)]
        elif self.color_palette == 'rainbow':
            colors = []
            for i in range(12):
                hue = i / 12
                rgb = colorsys.hsv_to_rgb(hue, 1.0, 1.0)
                colors.append(tuple(int(c * 255) for c in rgb))
            return colors
        else:
            return self._generate_palette_from_image()

    def _find_closest_color(self, color: Tuple[int, int, int]) -> Tuple[int, int, int]:
        """Find the closest color in the palette."""
        min_distance = float('inf')
        closest_color = self.palette_colors[0]

        for palette_color in self.palette_colors:
            distance = sum((c1 - c2) ** 2 for c1, c2 in zip(color, palette_color))
            if distance < min_distance:
                min_distance = distance
                closest_color = palette_color

        return closest_color

    def _get_average_color(self, image: Image.Image, x: int, y: int) -> Tuple[int, int, int]:
        """Get the average color of a tile region."""
        tile = image.crop((x, y, x + self.tile_size, y + self.tile_size))
        pixels = np.array(tile)
        avg_color = pixels.mean(axis=(0, 1))
        return tuple(int(c) for c in avg_color)

    def generate_basic_mosaic(self, image: Image.Image) -> Image.Image:
        """
        Generate a basic mosaic with solid color tiles.

        Args:
            image: Input PIL Image

        Returns:
            Mosaic image
        """
        # Resize image to be divisible by tile size
        width = (image.width // self.tile_size) * self.tile_size
        height = (image.height // self.tile_size) * self.tile_size
        image = image.resize((width, height), Image.LANCZOS)

        # Create output image
        mosaic = Image.new('RGB', (width, height))
        draw = ImageDraw.Draw(mosaic)

        # Process each tile
        for y in range(0, height, self.tile_size):
            for x in range(0, width, self.tile_size):
                avg_color = self._get_average_color(image, x, y)
                tile_color = self._find_closest_color(avg_color)

                # Draw tile
                draw.rectangle(
                    [x, y, x + self.tile_size, y + self.tile_size],
                    fill=tile_color
                )

        return mosaic

    def generate_circular_mosaic(self, image: Image.Image) -> Image.Image:
        """
        Generate a mosaic with circular tiles.

        Args:
            image: Input PIL Image

        Returns:
            Mosaic image with circular tiles
        """
        # Resize image to be divisible by tile size
        width = (image.width // self.tile_size) * self.tile_size
        height = (image.height // self.tile_size) * self.tile_size
        image = image.resize((width, height), Image.LANCZOS)

        # Create output image with background
        mosaic = Image.new('RGB', (width, height), (240, 240, 240))
        draw = ImageDraw.Draw(mosaic)

        # Process each tile
        radius = self.tile_size // 2 - 2
        for y in range(0, height, self.tile_size):
            for x in range(0, width, self.tile_size):
                avg_color = self._get_average_color(image, x, y)
                tile_color = self._find_closest_color(avg_color)

                # Draw circular tile
                center_x = x + self.tile_size // 2
                center_y = y + self.tile_size // 2
                draw.ellipse(
                    [center_x - radius, center_y - radius,
                     center_x + radius, center_y + radius],
                    fill=tile_color
                )

        return mosaic

    def generate_hexagonal_mosaic(self, image: Image.Image) -> Image.Image:
        """
        Generate a mosaic with hexagonal tiles.

        Args:
            image: Input PIL Image

        Returns:
            Mosaic image with hexagonal tiles
        """
        # Resize image
        width = (image.width // self.tile_size) * self.tile_size
        height = (image.height // self.tile_size) * self.tile_size
        image = image.resize((width, height), Image.LANCZOS)

        # Create output image
        mosaic = Image.new('RGB', (width, height), (240, 240, 240))
        draw = ImageDraw.Draw(mosaic)

        # Hexagon dimensions
        h_width = self.tile_size
        h_height = int(self.tile_size * 0.866)

        # Process hexagonal grid
        for row in range(0, height // h_height + 1):
            for col in range(0, width // h_width + 1):
                # Offset every other row
                offset_x = (h_width // 2) if row % 2 else 0
                x = col * h_width + offset_x
                y = row * h_height

                if x >= width or y >= height:
                    continue

                # Get average color for this region
                sample_x = min(x, width - self.tile_size)
                sample_y = min(y, height - self.tile_size)
                avg_color = self._get_average_color(image, sample_x, sample_y)
                tile_color = self._find_closest_color(avg_color)

                # Draw hexagon
                hexagon = self._create_hexagon(x, y, h_width // 2)
                draw.polygon(hexagon, fill=tile_color, outline=(200, 200, 200))

        return mosaic

    def _create_hexagon(self, cx: int, cy: int, size: int) -> List[Tuple[int, int]]:
        """Create hexagon coordinates."""
        angles = [i * 60 for i in range(6)]
        points = []
        for angle in angles:
            rad = np.radians(angle)
            x = cx + size * np.cos(rad)
            y = cy + size * np.sin(rad)
            points.append((int(x), int(y)))
        return points

    def generate_gradient_mosaic(self, image: Image.Image) -> Image.Image:
        """
        Generate a mosaic with gradient-filled tiles.

        Args:
            image: Input PIL Image

        Returns:
            Mosaic image with gradient tiles
        """
        # Resize image
        width = (image.width // self.tile_size) * self.tile_size
        height = (image.height // self.tile_size) * self.tile_size
        image = image.resize((width, height), Image.LANCZOS)

        # Create output image
        mosaic = Image.new('RGB', (width, height))

        # Process each tile
        for y in range(0, height, self.tile_size):
            for x in range(0, width, self.tile_size):
                avg_color = self._get_average_color(image, x, y)
                tile_color = self._find_closest_color(avg_color)

                # Create gradient tile
                tile = self._create_gradient_tile(tile_color)
                mosaic.paste(tile, (x, y))

        return mosaic

    def _create_gradient_tile(self, color: Tuple[int, int, int]) -> Image.Image:
        """Create a gradient tile."""
        tile = Image.new('RGB', (self.tile_size, self.tile_size))
        draw = ImageDraw.Draw(tile)

        for i in range(self.tile_size):
            factor = i / self.tile_size
            gradient_color = tuple(int(c * (0.5 + factor * 0.5)) for c in color)
            draw.line([(0, i), (self.tile_size, i)], fill=gradient_color)

        return tile

    def generate_pixelated_mosaic(self, image: Image.Image, blur: bool = False) -> Image.Image:
        """
        Generate a pixelated/retro-style mosaic.

        Args:
            image: Input PIL Image
            blur: Apply slight blur for softer look

        Returns:
            Pixelated mosaic image
        """
        # Calculate new dimensions
        width = image.width // self.tile_size
        height = image.height // self.tile_size

        # Downscale then upscale for pixelation effect
        small = image.resize((width, height), Image.LANCZOS)
        mosaic = small.resize((width * self.tile_size, height * self.tile_size), Image.NEAREST)

        if blur:
            mosaic = mosaic.filter(ImageFilter.GaussianBlur(radius=1))

        return mosaic


def main():
    """Main function to run the mosaic generator."""
    parser = argparse.ArgumentParser(description='Generate artistic mosaics from images')
    parser.add_argument('input', help='Input image path')
    parser.add_argument('-o', '--output', help='Output image path (default: input_mosaic.png)')
    parser.add_argument('-t', '--tile-size', type=int, default=20,
                        help='Size of mosaic tiles (default: 20)')
    parser.add_argument('-s', '--style', choices=['basic', 'circular', 'hexagonal', 'gradient', 'pixelated'],
                        default='basic', help='Mosaic style (default: basic)')
    parser.add_argument('-p', '--palette', choices=['vibrant', 'pastel', 'monochrome', 'rainbow'],
                        default='vibrant', help='Color palette (default: vibrant)')
    parser.add_argument('--blur', action='store_true',
                        help='Apply blur (pixelated style only)')

    args = parser.parse_args()

    # Validate input file
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found")
        return 1

    # Set output path
    if args.output:
        output_path = args.output
    else:
        base, ext = os.path.splitext(args.input)
        output_path = f"{base}_mosaic_{args.style}.png"

    print(f"Loading image: {args.input}")
    image = Image.open(args.input).convert('RGB')

    print(f"Generating {args.style} mosaic with {args.palette} palette...")
    generator = MosaicGenerator(tile_size=args.tile_size, color_palette=args.palette)

    # Generate mosaic based on style
    if args.style == 'basic':
        mosaic = generator.generate_basic_mosaic(image)
    elif args.style == 'circular':
        mosaic = generator.generate_circular_mosaic(image)
    elif args.style == 'hexagonal':
        mosaic = generator.generate_hexagonal_mosaic(image)
    elif args.style == 'gradient':
        mosaic = generator.generate_gradient_mosaic(image)
    elif args.style == 'pixelated':
        mosaic = generator.generate_pixelated_mosaic(image, blur=args.blur)

    print(f"Saving mosaic: {output_path}")
    mosaic.save(output_path, quality=95)
    print("Done!")

    return 0


if __name__ == '__main__':
    exit(main())
