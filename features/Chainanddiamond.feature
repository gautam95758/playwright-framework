Feature: Chain and Diamond Purchase

  @Test3
  Scenario: Buying a Chain from Reliance-Jewels
    Given the user navigates to the chain section
    When the user applies the gold filter for chains
    Then the user clicks on the first chain product
    And the user adds the chain to the cart
    Then the user proceeds to pay for the chain

  @Test4
  Scenario: Buying a Diamond from Reliance-Jewels
    Given the user navigates to the diamond section
    When the user applies the shape filter
    Then the user clicks on the first diamond product
    And the user adds the diamond to the cart
    Then the user proceeds to pay for the diamond
