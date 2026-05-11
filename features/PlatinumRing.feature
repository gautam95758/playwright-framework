Feature: Platinum Ring Purchase

  @Test6
  Scenario: Buying a Platinum Ring from Reliance-Jewels
    Given the user navigates to the rings section
    When the user applies the platinum filter
    Then the user clicks on the first platinum ring
    And the user adds the platinum ring to the cart
    Then the user proceeds to pay for the platinum ring
