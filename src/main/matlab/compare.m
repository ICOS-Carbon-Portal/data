function comp = compare(filename)

OrgData = csvread([filename '.csv'])(2:end,:);

plot(OrgData(:,2), OrgData(:,1), 'r'), hold on;

ScalaRes = csvread([filename '.reduced.csv']);

plot(ScalaRes(:,2), ScalaRes(:, 1), '.-g');


