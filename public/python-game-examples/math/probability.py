import itertools
from fractions import Fraction

print('순열:', len(list(itertools.permutations(range(1, 6), 2))))
print('조합:', list(itertools.combinations(range(1, 6), 2)))
print('두 목록의 곱:', list(itertools.product([1, 2], ['a', 'b'])))
print('세 목록의 곱:', list(itertools.product([1, 2], ['a', 'b'], [True, False])))

def is_prime(number):
    return number >= 2 and all(number % divisor != 0 for divisor in range(2, number))

events = list(itertools.product(range(1, 7), repeat=2))
favorable = [event for event in events if is_prime(sum(event))]
probability = Fraction(len(favorable), len(events))
print('합이 소수인 경우:', favorable)
print('확률:', probability)
assert len(events) == 36 and probability == Fraction(5, 12)
