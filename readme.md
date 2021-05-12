# Geometry Dash Texture Pack Splitter
A simple script to seperate spritesheets into individual images.

## How to use

### Instalation

1. Download or clone this repository and Node.js.
2. Navigate to the directory and open a terminal.
3. Run `npm install`.

### Splitting a Texture

1. Move the textures that you want to split (and their `.plist` files) into the directory.
2. Run `npm start`.
3. Choose `Split a texture`.
4. Select the texture that you want to split
5. Wait for the program to finish.

The split images will appear in a folder with the name of the texture that you split.
Do **not** resize the images unless you want the entire sprite sheet to be messed up.

### Merging a Texture

1. Make sure that both a `.plist` file and folder full of images from the sprite 
sheet are in the directory.
2. Run `npm start`.
3. Choose `Merge a texture`.
4. Select the texture that you want to merge
5. Wait for the program to finish.

The merged sprite sheet will appear in the `merged` folder that will appear, 
the exact same size as it started.