/* Correct solution for ex2 (C) */
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    if (argc == 3) {
        int a = atoi(argv[1]);
        int b = atoi(argv[2]);
        printf("%d\n", a + b);
    }
    return 0;
}
