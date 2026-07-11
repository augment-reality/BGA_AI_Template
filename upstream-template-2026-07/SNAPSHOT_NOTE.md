# Pristine BGA official template snapshot — taken 2026-07-11

Copied from c:\Users\hapha\OneDrive\Desktop\Spice\SpiceNew (Studio project "cardspice")
BEFORE it was modified into a real game. This is the freshest known official template.

- `.vscode/sftp.json` deliberately EXCLUDED (contained real Studio credentials).
- Use this to diff future template revisions and to keep BGA_Template\scaffold current.
- Notable vs older template generations: PlayerCounter component (counterFactory),
  $this->bga->playerScore object, notify->addDecorator, array $args injection into
  actions, getRandomZombieChoice; NO top-level .game.php entry shim.
