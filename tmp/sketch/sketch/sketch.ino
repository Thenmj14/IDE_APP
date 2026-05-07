#include "mark1.h"

Mark1 robot;


void setup() {
  robot.begin();

}

void loop() {
  robot.forward(150);
  Serial.println("hii..loop");
  delay(10);

}