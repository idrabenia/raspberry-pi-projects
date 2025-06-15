#include <wiringPi.h>
#include <stdio.h>
#define LedPin 7

int main(void)
{
  int i, j;

  if (wiringPiSetup() == -1)
  {
    //when initialize wiring failed,print messageto screen
    printf("setup wiringPi failed !");
    return 1;
  }

  printf("linker LedPin : GPIO %d(wiringPi pin)\n", LedPin); //when initialize wiring   successfully,print message to screen

  pinMode(LedPin, OUTPUT);

  while(1)
  {
    for (i = 0; i < 16; i += 1)
    {
      digitalWrite(LedPin, LOW); //led on
      delay(50);
      digitalWrite(LedPin, HIGH); //led off
      delay(50);
    }

    for (j = 0; j < 2; j += 1)
    {
      digitalWrite(LedPin, LOW); //led on
      delay(500);
      digitalWrite(LedPin, HIGH); //led off
      delay(500);
    }
  }

  return 0;
}

