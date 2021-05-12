# Geometry Dash Texture Pack Splitter
&nbsp;&nbsp;&nbsp;&nbsp;A simple script to seperate spritesheets into individual images.

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

&nbsp;&nbsp;&nbsp;&nbsp;The split images will appear in a folder with the name of the texture that you split.
Do **not** resize the images unless you want the entire sprite sheet to be messed up.

### Merging a Texture

1. Make sure that both a `.plist` file and folder full of images from the sprite 
sheet are in the directory.
2. Run `npm start`.
3. Choose `Merge a texture`.
4. Select the texture that you want to merge
5. Wait for the program to finish.

&nbsp;&nbsp;&nbsp;&nbsp;The merged sprite sheet will appear in the `merged` folder that will appear, 
the exact same size as it started.

## How it works

&nbsp;&nbsp;&nbsp;&nbsp;The textures and sprites for the Geometry Dash game are stored in very large 
images, most containing over 1000 images. The splitting commands for these 
images are stored in a `.plist` document (An XML document used by `Mac OS X`) 
with the same name as the image. 

&nbsp;&nbsp;&nbsp;&nbsp;What this script does is read the `.plist` file associated with the image and 
then uses the [sharp](https://www.npmjs.com/package/sharp) module from npm to extract the images from 
that data. Then, when you want to merge the texture back again, it takes each file in the folder 
with the same name as the `.plist` file and performs the necessary transformations 
and composites it onto a blank image with the original size.