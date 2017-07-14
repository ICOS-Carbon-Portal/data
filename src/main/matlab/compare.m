
OrgData = csvread('data1.csv')(2:end,:);

plot(OrgData(:,1), OrgData(:,2), 'r'), hold on;

ScalaRes = csvread('data1ScalaOut.csv');

plot(ScalaRes(:,1), ScalaRes(:, 2), 'g');


