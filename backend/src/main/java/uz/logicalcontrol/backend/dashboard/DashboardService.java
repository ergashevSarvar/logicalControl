package uz.logicalcontrol.backend.dashboard;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import uz.logicalcontrol.backend.exception.ExceptionEntryRepository;
import uz.logicalcontrol.backend.logging.ExecutionLogRepository;
import uz.logicalcontrol.backend.mn.LogicalControlEntity;
import uz.logicalcontrol.backend.mn.LogicalControlRepository;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final LogicalControlRepository logicalControlRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ExceptionEntryRepository exceptionEntryRepository;

    @Transactional(readOnly = true)
    public DashboardDtos.DashboardResponse getSummary() {
        var totalControls = logicalControlRepository.count();
        var activeControls = logicalControlRepository.countByStatus(LogicalControlEntity.ControlStatus.ACTIVE);
        var suspendedControls = logicalControlRepository.countByStatus(LogicalControlEntity.ControlStatus.SUSPENDED);
        var exceptions = exceptionEntryRepository.countByActiveTrue();

        var metrics = List.of(
            new DashboardDtos.MetricCard("total-controls", "MNlar soni", totalControls, "Barcha versiyalar ichida"),
            new DashboardDtos.MetricCard("active-controls", "Faol MN", activeControls, "Hozir ishlayotganlari"),
            new DashboardDtos.MetricCard("suspended-controls", "To'xtatilgan", suspendedControls, "Vaqtincha yoki bekor qilingan"),
            new DashboardDtos.MetricCard("exceptions", "Exceptions", exceptions, "Istisno yozuvlari soni")
        );

        var trend = buildTrend();
        var recent = executionLogRepository.findTop8ByOrderByInstimeDesc().stream()
            .map(log -> new DashboardDtos.RecentActivity(
                log.getControl().getId(),
                log.getControl().getCode(),
                log.getControl().getName(),
                log.getResult().name(),
                DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm").withZone(ZoneId.systemDefault()).format(log.getInstime())
            ))
            .toList();

        return new DashboardDtos.DashboardResponse(metrics, trend, recent);
    }

    private List<DashboardDtos.TrendPoint> buildTrend() {
        var trend = new ArrayList<DashboardDtos.TrendPoint>();
        var today = LocalDate.now();

        for (int index = 6; index >= 0; index--) {
            var date = today.minusDays(index);
            var dayStart = date.atStartOfDay(ZoneId.systemDefault()).toInstant();
            var dayEnd = date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            var monthStart = date.withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            var yearStart = date.withDayOfYear(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

            trend.add(new DashboardDtos.TrendPoint(
                date.format(DateTimeFormatter.ofPattern("dd MMM")),
                executionLogRepository.countByInstimeBetween(dayStart, dayEnd),
                executionLogRepository.countByInstimeBetween(monthStart, dayEnd),
                executionLogRepository.countByInstimeBetween(yearStart, dayEnd)
            ));
        }

        return trend;
    }
}
