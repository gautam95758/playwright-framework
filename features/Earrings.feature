Feature: Earrings Purchase

  @Test5
  Scenario: Buying Earrings from Reliance-Jewels
    Given the user navigates to the earrings section
    When the user applies gender filter for earrings
    Then the user applies type filter for earrings
    And the user clicks on the first earring product
    And the user adds the earring to the cart
