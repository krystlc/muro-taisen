import Phaser from "phaser";

export default class MainMenuScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buttons: Phaser.GameObjects.Image[] = [];
  private selectedButtonIndex = 0;
  private buttonSelector!: Phaser.GameObjects.Image;

  constructor() {
    super("MainMenuScene");
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("button", "button.png");
    this.load.image("cursor", "cursor.png");
  }

  create() {
    this.cursors = this.input.keyboard!.createCursorKeys();

    const { width, height } = this.scale;

    // Play button
    const onlineButton = this.add
      .image(width * 0.5, height * 0.6, "button")
      .setTint(0x193cb8)
      .setDisplaySize(150, 50);

    this.add.text(onlineButton.x, onlineButton.y, "Online").setOrigin(0.5);

    // Settings button
    const singlePlayerButton = this.add
      .image(
        onlineButton.x,
        onlineButton.y + onlineButton.displayHeight + 10,
        "button"
      )
      .setTint(0x193cb8)
      .setDisplaySize(150, 50);

    this.add
      .text(singlePlayerButton.x, singlePlayerButton.y, "Single Player")
      .setOrigin(0.5);

    // Credits button
    const optionsButton = this.add
      .image(
        singlePlayerButton.x,
        singlePlayerButton.y + singlePlayerButton.displayHeight + 10,
        "button"
      )
      .setTint(0x193cb8)
      .setDisplaySize(150, 50);

    this.add.text(optionsButton.x, optionsButton.y, "Options").setOrigin(0.5);

    this.buttons.push(onlineButton);
    this.buttons.push(singlePlayerButton);
    this.buttons.push(optionsButton);
    this.buttonSelector = this.add
      .image(0, 0, "cursor")
      .setDisplaySize(24, 24)
      .setRotation(-0.8);

    this.selectButton(0);

    onlineButton.on("selected", () => {
      this.scene.start("MultiPlayerScene");
    });

    singlePlayerButton.on("selected", () => {
      this.scene.start("SinglePlayerScene");
    });

    optionsButton.on("selected", () => {
      this.scene.start("OptionsScene");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      onlineButton.off("selected");
      // ...
    });
  }

  selectButton(index: number) {
    const currentButton = this.buttons[this.selectedButtonIndex];

    // set the current selected button to a white tint
    currentButton.setTint(0x193cb8);

    const button = this.buttons[index];

    // set the newly selected button to a green tint
    button.setTint(0x66ff7f);

    // move the hand cursor to the right edge
    this.buttonSelector.x = button.x + button.displayWidth * 0.5;
    this.buttonSelector.y = button.y + 10;

    // store the new selected index
    this.selectedButtonIndex = index;
  }

  selectNextButton(change = 1) {
    let index = this.selectedButtonIndex + change;

    // wrap the index to the front or end of array
    if (index >= this.buttons.length) {
      index = 0;
    } else if (index < 0) {
      index = this.buttons.length - 1;
    }

    this.selectButton(index);
  }

  confirmSelection() {
    // get the currently selected button
    const button = this.buttons[this.selectedButtonIndex];

    // emit the 'selected' event
    button.emit("selected");
  }

  update() {
    const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up!);
    const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down!);
    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(
      this.cursors.space!
    );

    if (upJustPressed) {
      this.selectNextButton(-1);
    } else if (downJustPressed) {
      this.selectNextButton(1);
    } else if (spaceJustPressed) {
      this.confirmSelection();
    }
  }
}
