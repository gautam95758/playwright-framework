Feature: Vivaham Collection Purchase

  @Test7
  Scenario: Buying from Vivaham collection on Reliance-Jewels
    Given the user navigates to vivaham section
    When the user applies metal filter in vivaham
    Then the user clicks on the first vivaham product
    And the user adds the vivaham product to cart
    Then the user proceeds to pay for vivaham product
