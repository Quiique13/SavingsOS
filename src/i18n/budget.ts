// Monthly budgeting uses the previous month's receipts; scenarios never persist.
export const budget = `
Income available|Rendimentos disponíveis|Revenus disponibles|Ingresos disponibles
Received in {{month}}|Recebido em {{month}}|Reçu en {{month}}|Recibido en {{month}}
Last month's income minus this month's plan|Rendimentos do mês passado menos o plano deste mês|Revenus du mois précédent moins le budget de ce mois|Ingresos del mes pasado menos el plan de este mes
Each month's plan uses income received in the previous month.|O plano de cada mês utiliza os rendimentos recebidos no mês anterior.|Le budget de chaque mois utilise les revenus reçus le mois précédent.|El plan de cada mes utiliza los ingresos recibidos el mes anterior.
Income received in {{receivedMonth}} funds {{budgetMonth}}.|Os rendimentos recebidos em {{receivedMonth}} financiam {{budgetMonth}}.|Les revenus reçus en {{receivedMonth}} financent {{budgetMonth}}.|Los ingresos recibidos en {{receivedMonth}} financian {{budgetMonth}}.
{{count}} entries received in {{month}}|{{count}} entradas recebidas em {{month}}|{{count}} entrées reçues en {{month}}|{{count}} entradas recibidas en {{month}}
Income funding this month|Rendimentos que financiam este mês|Revenus qui financent ce mois|Ingresos que financian este mes
No income funding this month|Sem rendimentos para financiar este mês|Aucun revenu pour financer ce mois|No hay ingresos para financiar este mes
Record income received last month to fund this plan.|Registe os rendimentos recebidos no mês passado para financiar este plano.|Enregistrez les revenus reçus le mois précédent pour financer ce budget.|Registra los ingresos recibidos el mes pasado para financiar este plan.
Your latest funded month is|O último mês com financiamento é|Votre dernier mois financé est|Tu último mes financiado es
This income funds the month after its received date.|Este rendimento financia o mês seguinte à data de recebimento.|Ce revenu finance le mois suivant sa date de réception.|Este ingreso financia el mes siguiente a su fecha de recepción.
Monthly simulator|Simulador mensal|Simulateur mensuel|Simulador mensual
Try a different income for {{month}} and see what could be left.|Experimente um rendimento diferente para {{month}} e veja quanto poderá sobrar.|Essayez un autre revenu pour {{month}} et voyez ce qu’il pourrait rester.|Prueba un ingreso diferente para {{month}} y comprueba cuánto podría sobrar.
What if?|E se…?|Et si… ?|¿Y si…?
Hypothetical income (€)|Rendimento hipotético (€)|Revenu hypothétique (€)|Ingreso hipotético (€)
Extra income (€)|Rendimentos extra (€)|Revenus supplémentaires (€)|Ingresos extra (€)
Extra spending (€)|Despesas extra (€)|Dépenses supplémentaires (€)|Gastos extra (€)
Carryover before income (€)|Saldo anterior ao rendimento (€)|Report avant revenus (€)|Saldo anterior al ingreso (€)
Carryover is money left before this month's income. Scenarios stay on this page and never change your records.|O saldo anterior é o dinheiro que resta antes do rendimento deste mês. As simulações ficam nesta página e nunca alteram os seus registos.|Le report est l’argent restant avant les revenus de ce mois. Les simulations restent sur cette page et ne modifient jamais vos données.|El saldo anterior es el dinero que queda antes del ingreso de este mes. Las simulaciones se quedan en esta página y nunca cambian tus registros.
Enter valid amounts with up to two decimals. Only carryover can be negative.|Introduza montantes válidos com até duas casas decimais. Apenas o saldo anterior pode ser negativo.|Saisissez des montants valides avec deux décimales au maximum. Seul le report peut être négatif.|Introduce importes válidos con hasta dos decimales. Solo el saldo anterior puede ser negativo.
Reset to saved income|Repor rendimentos guardados|Rétablir les revenus enregistrés|Restablecer ingresos guardados
Available in scenario|Disponível na simulação|Disponible dans la simulation|Disponible en la simulación
Extra spending|Despesas extra|Dépenses supplémentaires|Gastos extra
Estimated month-end money|Estimativa do saldo no fim do mês|Estimation du solde en fin de mois|Estimación del saldo a fin de mes
Shortfall after planned spending|Valor em falta após as despesas previstas|Déficit après les dépenses prévues|Déficit tras los gastos previstos
Left after planned spending|Valor restante após as despesas previstas|Reste après les dépenses prévues|Restante tras los gastos previstos
Complete the scenario to see your estimate|Preencha a simulação para ver a estimativa|Complétez la simulation pour voir votre estimation|Completa la simulación para ver tu estimación
Includes every planned bill once, including bills already marked paid.|Inclui cada despesa prevista uma única vez, incluindo as já marcadas como pagas.|Comprend chaque facture prévue une seule fois, y compris celles déjà marquées comme payées.|Incluye cada gasto previsto una sola vez, incluidos los ya marcados como pagados.
`;
